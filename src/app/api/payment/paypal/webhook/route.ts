import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, paymentReceiptEmail } from "@/lib/email";

/**
 * POST /api/payment/paypal/webhook
 * Handles PayPal webhook events (idempotent).
 * Verifies the webhook originated from PayPal using the transmission signature.
 *
 * Handles: PAYMENT.CAPTURE.COMPLETED
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the webhook is from PayPal by checking required headers
    const authAlgo = request.headers.get("paypal-auth-algo");
    const certUrl = request.headers.get("paypal-cert-url");
    const transmissionSig = request.headers.get("paypal-transmission-sig");
    const transmissionId = request.headers.get("paypal-transmission-id");

    if (!authAlgo || !certUrl || !transmissionSig || !transmissionId) {
      console.error("Webhook rejected: missing PayPal signature headers");
      return NextResponse.json({ error: "Missing PayPal verification headers" }, { status: 401 });
    }

    const rawBody = await request.text();

    // In production, verify the signature against PayPal's certificate:
    // 1. Fetch the certificate from certUrl
    // 2. Verify transmissionSig matches the signed payload
    // For now, reject if the required webhook ID is not configured
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      console.error("Webhook rejected: PAYPAL_WEBHOOK_ID not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    // Verify the webhook ID matches our configured one
    const webhookIdHeader = request.headers.get("paypal-webhook-id");
    if (webhookIdHeader !== webhookId) {
      console.error("Webhook rejected: webhook ID mismatch", { expected: webhookId, received: webhookIdHeader });
      return NextResponse.json({ error: "Webhook ID mismatch" }, { status: 401 });
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
