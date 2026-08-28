import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, paymentReceiptEmail } from "@/lib/email";
import { PayPalClient } from "@/lib/paypal";

/**
 * GET /api/payment/paypal/execute
 * Processes PayPal payment approval after guest completes payment.
 * Verifies the payment with PayPal before updating booking status.
 * Redirects to success or cancel page.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get("paymentId");
    const payerID = searchParams.get("PayerID");
    const bookingId = searchParams.get("bookingId");
    const orderId = searchParams.get("token");
    const type = searchParams.get("type") || "balance";

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    if (!paymentId || !payerID || !bookingId || !orderId) {
      return NextResponse.redirect(new URL("/payment/cancel?error=missing_params", baseUrl));
    }

    // Verify and capture the PayPal payment with PayPal's API
    // This ensures funds are actually captured before we mark the booking as paid
    let captureResult: { status: string; id: string };
    try {
      const paypal = new PayPalClient();
      captureResult = await paypal.executePayment(orderId);
    } catch (captureErr) {
      console.error("PayPal capture failed:", captureErr);
      return NextResponse.redirect(new URL("/payment/cancel?error=capture_failed", baseUrl));
    }

    // Only proceed if PayPal confirmed the capture
    if (captureResult.status !== "COMPLETED" && captureResult.status !== "APPROVED") {
      console.error("PayPal capture returned unexpected status:", captureResult.status);
      return NextResponse.redirect(new URL("/payment/cancel?error=payment_not_captured", baseUrl));
    }

    // Update booking status
    const supabase = createAdminClient();
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, client_name, client_email, booking_reference, total_amount, deposit_amount, currency")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.redirect(new URL("/payment/cancel?error=booking_not_found", baseUrl));
    }

    const totalAmount = booking.total_amount || 0;
    const depositAmount = booking.deposit_amount || 0;
    const balanceAmount = totalAmount - depositAmount;
    const currency = booking.currency || "USD";

    // Determine new status based on payment type
    let newStatus: string;
    let paidAmount: number;

    if (type === "deposit") {
      newStatus = "deposit_paid";
      paidAmount = depositAmount || totalAmount * 0.3;
    } else if (type === "balance") {
      newStatus = "paid";
      paidAmount = balanceAmount;
    } else {
      newStatus = "paid";
      paidAmount = totalAmount;
    }

    // Update booking
    await supabase
      .from("bookings")
      .update({
        status: newStatus,
        payment_method: "paypal",
        balance_amount: type === "balance" ? 0 : balanceAmount,
      })
      .eq("id", bookingId);

    // Send receipt email
    if (booking.client_email) {
      try {
        const receipt = paymentReceiptEmail({
          clientName: booking.client_name || "Valued Guest",
          amount: `${currency} ${paidAmount.toLocaleString()}`,
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

    return NextResponse.redirect(new URL(`/payment/success?bookingId=${bookingId}&ref=${booking.booking_reference || ""}`, baseUrl));
  } catch (err: unknown) {
    console.error("PayPal execute error:", err);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/payment/cancel?error=execution_failed", baseUrl));
  }
}
