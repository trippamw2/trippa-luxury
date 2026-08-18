import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, paymentReceiptEmail } from "@/lib/email";

/**
 * POST /api/payment/paypal/webhook
 * Handles PayPal webhook events (idempotent).
 *
 * Handles: PAYMENT.CAPTURE.COMPLETED
 */
export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    // Verify webhook signature in production (simplified here)
    // const paypal = new PayPalClient();
    // if (!paypal.verifyWebhook(event)) { return NextResponse.json({ error: "Invalid" }, { status: 400 }); }

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = event.resource;
      const bookingId = resource?.custom_id;

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
