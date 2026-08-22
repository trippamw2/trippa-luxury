import { NextRequest, NextResponse } from "next/server";
import { paymentEngine } from "@/lib/ai/payment-engine";
import { sendEmail } from "@/lib/email";
import { generateInvoicePDFBuffer } from "@/lib/documents/invoice-pdf";

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

    // 3. Generate PDF attachment (payment invoice)
    let pdfAttachment: { content: string; name: string } | undefined;
    try {
      const dueDateStr = dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
      const pdfBuffer = await generateInvoicePDFBuffer({
        invoiceNumber: `INV-${bookingRef}-${(type || "DEP").toUpperCase()}`,
        bookingRef,
        clientName,
        clientEmail,
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: dueDateStr,
        lineItems: [
          {
            description: description || `Kivara ${type === "deposit" ? "Deposit" : type === "balance" ? "Balance Payment" : "Full Payment"}`,
            quantity: 1,
            unitPrice: Number(amount),
            total: Number(amount),
          },
        ],
        subtotal: Number(amount),
        taxRate: 0,
        taxAmount: 0,
        totalAmount: Number(amount),
        currency: currency || "USD",
        status: "pending",
      });
      pdfAttachment = {
        content: pdfBuffer.toString("base64"),
        name: `Kivara-Invoice-${bookingRef}.pdf`,
      };
    } catch (pdfError) {
      console.error("PDF generation error (non-fatal):", pdfError);
    }

    // 4. Send email with PDF attachment
    const result = await sendEmail({
      to: [{ email: clientEmail, name: clientName }],
      subject: `${typeLabel} Required : ${bookingRef} : Kivara Luxury Travel`,
      htmlContent: html,
      ...(pdfAttachment ? { attachment: [pdfAttachment] } : {}),
    });

    return NextResponse.json({
      success: true,
      paymentUrl: link.paymentUrl,
      messageId: result.messageId,
      pdfAttached: !!pdfAttachment,
    });
  } catch (error) {
    console.error("Send payment link error:", error);
    return NextResponse.json(
      { error: "Failed to generate and send payment link" },
      { status: 500 }
    );
  }
}
