import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, paymentReceiptEmail } from "@/lib/email";
import { readPayPalHeaders, verifyPayPalSignature } from "@/lib/payments/paypal-signature";
import { amountsEqual, derivePayableAmount } from "@/lib/payments/amounts";

/**
 * POST /api/payment/paypal/webhook
 * Handles PayPal webhook events (idempotent).
 * Verifies the webhook cryptographically against PayPal's certificate.
 *
 * Handles: PAYMENT.CAPTURE.COMPLETED
 *
 * The webhook is a settlement *fallback*: PayPal fires it when a capture
 * completes, and the guest may or may not reach the execute redirect. Both
 * paths settle the booking, so both must agree on the amount a capture settles
 * and write the payments ledger under the same capture id. The unique partial
 * index on payments.paypal_transaction_id (migration 037) makes the second
 * writer a no-op instead of a duplicate row.
 */
export async function POST(request: NextRequest) {
  try {
    // The raw body is required for verification and must be read BEFORE parsing:
    // the CRC32 is computed over these exact bytes, so re-serialising the parsed
    // object would invalidate an otherwise valid signature.
    const rawBody = await request.text();
    const configuredWebhookId = process.env.PAYPAL_WEBHOOK_ID;

    // Prove the notification came from PayPal. This is the only thing standing
    // between an unauthenticated POST and a booking being marked paid, so it
    // runs before the body is trusted for anything.
    const outcome = await verifyPayPalSignature(
      readPayPalHeaders(request.headers),
      rawBody,
      configuredWebhookId ?? ""
    );

    if (!outcome.verified) {
      // Never log the signature or the configured webhook id.
      console.error("Webhook rejected: signature verification failed", {
        reason: outcome.reason,
        detail: outcome.detail,
      });
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = event.resource as Record<string, unknown> | undefined;
      const bookingId = resource?.custom_id as string | undefined;
      const captureId = resource?.id as string | undefined;

      if (!bookingId) {
        return NextResponse.json({ received: true, message: "No booking ID in event" });
      }

      // The captured amount is the only thing that identifies which payment
      // this capture settles. It must match what the booking owes for exactly
      // one payment type; a capture that matches nothing must not clobber the
      // booking's state. A missing unreadable amount is unknown, not a pass.
      const rawAmount = (resource?.amount as { value?: unknown } | undefined)?.value;
      const rawCurrency = (resource?.amount as { currency_code?: unknown } | undefined)?.currency_code;
      const capturedAmount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
      const capturedCurrency = typeof rawCurrency === "string" ? rawCurrency : "";

      const supabase = createAdminClient();
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, client_name, client_email, booking_reference, total_amount, deposit_amount, balance_amount, currency, status, swift_confirmation_code")
        .eq("id", bookingId)
        .single();

      if (!booking) {
        return NextResponse.json({ received: true, message: "Booking not found" });
      }

      // Match the capture to a payment type on the same arithmetic the create
      // and execute routes use, so the three paths cannot disagree about what
      // a given amount means. When the amounts are ambiguous (e.g. deposit and
      // balance are equal) the booking's current state breaks the tie: a
      // deposit_paid booking receiving another equal capture is a balance or
      // full payment, never a second deposit.
      const paymentTypes: Array<
        { type: "deposit" | "balance" | "full"; payable: ReturnType<typeof derivePayableAmount> }
      > = ["deposit", "balance", "full"].map((type) => ({
        type: type as "deposit" | "balance" | "full",
        payable: derivePayableAmount(booking, type as "deposit" | "balance" | "full"),
      }));

      const ordered =
        booking.status === "deposit_paid" || booking.status === "paid"
          ? [...paymentTypes.filter((p) => p.type !== "deposit"), ...paymentTypes.filter((p) => p.type === "deposit")]
          : paymentTypes;

      const matched = ordered.find(
        ({ payable }) =>
          payable !== null &&
          amountsEqual(payable.amount, capturedAmount) &&
          payable.currency === capturedCurrency
      );

      if (!matched?.payable) {
        console.error("Webhook: capture amount matches no payable amount for booking", {
          bookingId,
          captureId,
          capturedAmount,
          capturedCurrency,
        });
        return NextResponse.json({ received: true, message: "Capture matches no payable amount" });
      }

      const { type, payable } = matched;

      // Settle only when the booking has not already passed this state. The
      // execute redirect may have settled it first; a capture for a deposit on
      // a booking already past deposit_paid must never regress it.
      const settledStatuses: Record<string, string> = {
        deposit: "deposit_paid",
        balance: "paid",
        full: "paid",
      };
      const nextStatus = settledStatuses[type];
      const alreadyAtOrPast =
        booking.status === nextStatus ||
        (type === "balance" && booking.status === "paid") ||
        (type === "full" && booking.status === "paid") ||
        (type === "deposit" && (booking.status === "deposit_paid" || booking.status === "paid"));

      if (!alreadyAtOrPast) {
        await supabase
          .from("bookings")
          .update({
            status: type === "deposit" ? "deposit_paid" : "paid",
            payment_method: "paypal",
            balance_amount: payable.remainingBalance,
          })
          .eq("id", bookingId);
      }

      // Write the payments ledger. The execute route may have written this
      // capture already; 23505 (unique_violation) is that expected race, so
      // only unexpected failures are worth logging.
      const { error: paymentError } = await supabase.from("payments").insert({
        booking_id: bookingId,
        amount: payable.amount,
        currency: payable.currency,
        payment_method: "paypal",
        payment_type: type,
        reference: booking.swift_confirmation_code
          ? String(booking.swift_confirmation_code)
          : captureId ?? "",
        paypal_transaction_id: captureId ?? null,
        status: "completed",
        paid_at: new Date().toISOString(),
      });
      if (paymentError && paymentError.code !== "23505") {
        console.error("Webhook: failed to write payments ledger row:", paymentError.message);
      }

      // Send the receipt only when this webhook actually settled the booking.
      // If the execute redirect already settled it (and sent its own receipt),
      // a second email here would be noise.
      if (!alreadyAtOrPast && booking.client_email) {
        try {
          const receipt = paymentReceiptEmail({
            clientName: booking.client_name || "Valued Guest",
            amount: `${payable.currency} ${payable.amount.toLocaleString()}`,
            bookingRef: booking.booking_reference || bookingId.slice(0, 8).toUpperCase(),
            paymentMethod: "PayPal",
          });

          await sendEmail({
            to: [{ email: booking.client_email, name: booking.client_name || "Valued Guest" }],
            subject: receipt.subject,
            htmlContent: receipt.htmlContent,
          });
        } catch (emailErr) {
          console.error("Webhook: failed to send receipt:", emailErr);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("PayPal webhook error:", err);
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
