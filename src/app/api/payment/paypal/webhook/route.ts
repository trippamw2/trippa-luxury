import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, paymentReceiptEmail } from "@/lib/email";
import { readPayPalHeaders, verifyPayPalSignature } from "@/lib/payments/paypal-signature";

/**
 * POST /api/payment/paypal/webhook
 * Handles PayPal webhook events (idempotent).
 * Verifies the webhook cryptographically against PayPal's certificate.
 *
 * Handles: PAYMENT.CAPTURE.COMPLETED
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

      if (!bookingId) {
        return NextResponse.json({ received: true, message: "No booking ID in event" });
      }

      const supabase = createAdminClient();
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, client_name, client_email, booking_reference, total_amount, balance_amount, currency")
        .eq("id", bookingId)
        .single();

      if (booking) {
        const totalAmount = booking.total_amount || 0;
        const currency = booking.currency || "USD";

        // Update booking to paid
        await supabase
          .from("bookings")
          .update({
            status: "paid",
            payment_method: "paypal",
            balance_amount: 0,
          })
          .eq("id", bookingId);

        // Send receipt
        if (booking.client_email) {
          try {
            const receipt = paymentReceiptEmail({
              clientName: booking.client_name || "Valued Guest",
              amount: `${currency} ${totalAmount.toLocaleString()}`,
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
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("PayPal webhook error:", err);
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
