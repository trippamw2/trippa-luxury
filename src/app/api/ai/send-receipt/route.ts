import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { paymentEngine } from "@/lib/ai/payment-engine";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/ai/send-receipt
 * Generates a payment receipt and emails it to the guest.
 *
 * Admin-only - requires at least editor role.
 *
 * Without a guard this is the most dangerous kind of open endpoint: it sends a
 * genuine-looking payment receipt, complete with a real receipt reference, to
 * any address an attacker supplies. That is a convincing phishing primitive
 * under the company's own domain.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin({ module: "finance", minRole: "editor" });

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
      subject: `Payment Receipt : ${receipt.receiptRef} : kivara.africa`,
      htmlContent: html,
    });

    return NextResponse.json({
      success: true,
      receiptRef: receipt.receiptRef,
      messageId: result.messageId,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Send receipt error:", error);
    return NextResponse.json({ error: "Failed to generate and send receipt" }, { status: 500 });
  }
}
