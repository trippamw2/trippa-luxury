import { NextRequest, NextResponse } from "next/server";
import { paymentEngine } from "@/lib/ai/payment-engine";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingRef, clientName, clientEmail, amount, currency, type, dueDate, description } = body;

    if (!bookingRef || !clientName || !clientEmail || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: bookingRef, clientName, clientEmail, amount" },
        { status: 400 }
      );
    }

    // 1. Generate payment link
    const link = paymentEngine.generatePaymentLink({
      bookingRef,
      clientName,
      clientEmail,
      amount: Number(amount),
      currency: currency || "USD",
      type: type || "deposit",
      dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      description: description || `Payment for booking ${bookingRef}`,
    });

    // 2. Generate HTML email
    const html = paymentEngine.generatePaymentLinkHtml(link);

    const typeLabel = type === "deposit" ? "Deposit" : type === "balance" ? "Balance Payment" : "Full Payment";

    // 3. Send email
    const result = await sendEmail({
      to: [{ email: clientEmail, name: clientName }],
      subject: `${typeLabel} Required — ${bookingRef} — Kivara Luxury Travel`,
      htmlContent: html,
    });

    return NextResponse.json({
      success: true,
      paymentUrl: link.paymentUrl,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Send payment link error:", error);
    return NextResponse.json(
      { error: "Failed to generate and send payment link" },
      { status: 500 }
    );
  }
}
