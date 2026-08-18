import { NextRequest, NextResponse } from "next/server";
import { PayPalClient } from "@/lib/paypal";

/**
 * POST /api/payment/paypal/create
 * Creates a PayPal payment for a booking.
 *
 * Body: { bookingId: string, amount: number, currency: string, type: "deposit" | "balance" | "full" }
 * Returns: { approvalUrl: string, paymentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { bookingId, amount, currency = "USD", type = "balance" } = await request.json();

    if (!bookingId || !amount) {
      return NextResponse.json({ error: "bookingId and amount are required" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const paypal = new PayPalClient();
    const payment = await paypal.createPayment({
      amount: String(amount),
      currency,
      description: `Kivara ${type === "deposit" ? "Deposit" : type === "balance" ? "Balance Payment" : "Full Payment"} — ${bookingId}`,
      returnUrl: `${baseUrl}/api/payment/paypal/execute?bookingId=${bookingId}&type=${type}`,
      cancelUrl: `${baseUrl}/payment/cancel?bookingId=${bookingId}`,
    });

    return NextResponse.json({
      approvalUrl: payment.approvalUrl,
      paymentId: payment.paymentId,
    });
  } catch (err: unknown) {
    console.error("PayPal create error:", err);
    const message = err instanceof Error ? err.message : "Failed to create PayPal payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
