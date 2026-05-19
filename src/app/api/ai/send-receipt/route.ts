import { NextRequest, NextResponse } from "next/server";
import { paymentEngine } from "@/lib/ai/payment-engine";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingRef, clientName, clientEmail, amount, currency, paymentMethod, paidAt, type, balanceRemaining } = body;

    if (!bookingRef || !clientName || !clientEmail || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: bookingRef, clientName, clientEmail, amount" },
        { status: 400 }
      );
    }

    const { receipt, html } = paymentEngine.generateReceipt({
      bookingRef,
      clientName,
      clientEmail,
      amount: Number(amount),
      currency: currency || "USD",
      paymentMethod: paymentMethod || "Bank Transfer",
      paidAt: paidAt || new Date().toISOString(),
      type: type || "deposit",
      balanceRemaining: balanceRemaining ? Number(balanceRemaining) : undefined,
    });

    const result = await sendEmail({
      to: [{ email: clientEmail, name: clientName }],
      subject: `Payment Receipt — ${receipt.receiptRef} — Kivara Luxury Travel`,
      htmlContent: html,
    });

    return NextResponse.json({
      success: true,
      receiptRef: receipt.receiptRef,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Send receipt error:", error);
    return NextResponse.json({ error: "Failed to generate and send receipt" }, { status: 500 });
  }
}
