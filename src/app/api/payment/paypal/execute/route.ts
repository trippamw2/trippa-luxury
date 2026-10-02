import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, paymentReceiptEmail } from "@/lib/email";
import { PayPalClient } from "@/lib/paypal";
import { amountsEqual, derivePayableAmount, isPaymentType } from "@/lib/payments/amounts";

/**
 * GET /api/payment/paypal/execute
 * Processes PayPal payment approval after guest completes payment.
 *
 * Trust boundary: `bookingId`, `token` and `type` all arrive from the browser,
 * so none of them is evidence that a booking was paid. A booking is confirmed
 * only when the captured PayPal order proves all three of:
 *   1. the capture completed,
 *   2. the order was created for *this* booking (custom_id), and
 *   3. the captured total and currency equal what this booking owes.
 *
 * Without (2) and (3) a guest could pay a token amount on their own order and
 * have an unrelated booking marked paid.
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const cancel = (error: string) =>
    NextResponse.redirect(new URL(`/payment/cancel?error=${error}`, baseUrl));

  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get("paymentId");
    const payerID = searchParams.get("PayerID");
    const bookingId = searchParams.get("bookingId");
    const orderId = searchParams.get("token");
    const requestedType = searchParams.get("type") || "balance";

    if (!paymentId || !payerID || !bookingId || !orderId) {
      return cancel("missing_params");
    }

    if (!isPaymentType(requestedType)) {
      return cancel("invalid_payment_type");
    }

    // Resolve what this booking owes BEFORE capturing, so the captured figure can
    // be checked against it.
    const supabase = createAdminClient();
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, client_name, client_email, booking_reference, total_amount, deposit_amount, currency")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return cancel("booking_not_found");
    }

    const payable = derivePayableAmount(booking, requestedType);
    if (!payable) {
      return cancel("booking_not_payable");
    }

    let capture;
    try {
      capture = await new PayPalClient().executePayment(orderId);
    } catch (captureErr) {
      console.error("PayPal capture failed:", captureErr);
      return cancel("capture_failed");
    }

    if (capture.status !== "COMPLETED" && capture.status !== "APPROVED") {
      console.error("PayPal capture returned unexpected status:", capture.status);
      return cancel("payment_not_captured");
    }

    // Bind the order to the booking. createOrder stamps custom_id with the
    // bookingId, so a mismatch means this order was raised for a different
    // booking and must not settle this one.
    if (capture.bookingReference !== bookingId) {
      console.error("PayPal order/booking mismatch", {
        orderId,
        bookingId,
        orderBookingReference: capture.bookingReference,
      });
      return cancel("order_mismatch");
    }

    // An unreadable amount is unknown, not zero, and never a pass.
    if (!Number.isFinite(capture.amount)) {
      console.error("PayPal capture carried no readable amount", { orderId });
      return cancel("amount_unverifiable");
    }

    if (capture.currency && capture.currency !== payable.currency) {
      console.error("PayPal capture currency mismatch", {
        orderId,
        captured: capture.currency,
        expected: payable.currency,
      });
      return cancel("currency_mismatch");
    }

    if (!amountsEqual(capture.amount, payable.amount)) {
      console.error("PayPal capture amount mismatch", {
        orderId,
        bookingId,
        captured: capture.amount,
        expected: payable.amount,
      });
      return cancel("amount_mismatch");
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: payable.nextStatus,
        payment_method: "paypal",
        balance_amount: payable.remainingBalance,
      })
      .eq("id", bookingId);

    if (updateError) {
      // The money is captured but the booking is not updated. Do not report
      // success: the captured order id is needed for a manual reconciliation.
      console.error("PayPal capture succeeded but booking update failed", {
        orderId,
        bookingId,
        captured: capture.amount,
        detail: updateError.message,
      });
      return cancel("booking_update_failed");
    }

    if (booking.client_email) {
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
        console.error("Failed to send receipt email:", emailErr);
        // Don't fail the payment for email errors
      }
    }

    const success = new URL(`/payment/success?bookingId=${bookingId}`, baseUrl);
    if (booking.booking_reference) success.searchParams.set("ref", booking.booking_reference);
    return NextResponse.redirect(success);
  } catch (err: unknown) {
    console.error("PayPal execute error:", err);
    return cancel("execution_failed");
  }
}
