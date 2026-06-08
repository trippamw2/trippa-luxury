// ─── Kivara Receipt Document ───────────────────────────────────────────

import { wrapDocument, documentHeader, documentBody, documentFooter, refBox } from "./template";

export interface ReceiptDocumentData {
  receiptRef: string;
  bookingRef: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paidAt: string;
  type: string;
  balanceRemaining?: number;
}

export function generateReceiptDocument(data: ReceiptDocumentData): string {
  const html = `
    ${documentHeader({ title: "Payment Receipt", reference: data.receiptRef, clientName: data.clientName })}
    ${documentBody(`
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background: #C9A96E; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 32px; color: #1A1A1A;">✓</span>
        </div>
        <h1 style="font-size: 22px; margin-bottom: 4px;">Payment Received</h1>
        <p style="font-size: 14px; color: #8B7D6B;">Thank you, ${data.clientName}</p>
      </div>

      ${refBox("Receipt Reference", data.receiptRef)}

      <table style="margin-bottom: 24px;">
        <tr><td style="padding: 10px 0; font-size: 12px; color: #8B7D6B; border-bottom: 1px solid #EDE5DA; width: 140px;">Receipt</td><td style="padding: 10px 0; font-size: 14px; font-weight: 600; border-bottom: 1px solid #EDE5DA;">${data.receiptRef}</td></tr>
        <tr><td style="padding: 10px 0; font-size: 12px; color: #8B7D6B; border-bottom: 1px solid #EDE5DA;">Booking</td><td style="padding: 10px 0; font-size: 14px; border-bottom: 1px solid #EDE5DA;">${data.bookingRef}</td></tr>
        <tr><td style="padding: 10px 0; font-size: 12px; color: #8B7D6B; border-bottom: 1px solid #EDE5DA;">Amount</td><td style="padding: 10px 0; font-size: 22px; font-weight: 700; color: #C9A96E; border-bottom: 1px solid #EDE5DA;">${data.currency} ${data.amount.toLocaleString()}</td></tr>
        <tr><td style="padding: 10px 0; font-size: 12px; color: #8B7D6B; border-bottom: 1px solid #EDE5DA;">Payment Method</td><td style="padding: 10px 0; font-size: 14px; border-bottom: 1px solid #EDE5DA;">${data.paymentMethod}</td></tr>
        <tr><td style="padding: 10px 0; font-size: 12px; color: #8B7D6B; border-bottom: 1px solid #EDE5DA;">Payment Type</td><td style="padding: 10px 0; font-size: 14px; border-bottom: 1px solid #EDE5DA; text-transform: capitalize;">${data.type}</td></tr>
        <tr><td style="padding: 10px 0; font-size: 12px; color: #8B7D6B; border-bottom: 1px solid #EDE5DA;">Date</td><td style="padding: 10px 0; font-size: 14px; border-bottom: 1px solid #EDE5DA;">${new Date(data.paidAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
        ${data.balanceRemaining ? `<tr><td style="padding: 10px 0; font-size: 12px; color: #8B7D6B; border-bottom: 1px solid #EDE5DA;">Balance Remaining</td><td style="padding: 10px 0; font-size: 14px; border-bottom: 1px solid #EDE5DA;">${data.currency} ${data.balanceRemaining.toLocaleString()}</td></tr>` : ""}
      </table>

      <p>Your journey is one step closer. Our concierge team is curating every detail to ensure your experience is remarkable.</p>
      <p style="margin-top: 16px;">Warmest regards,<br><strong style="color: #C9A96E;">The Kivara Team</strong></p>
    `)}
    ${documentFooter()}
  `;

  return wrapDocument(html, { title: `Receipt ${data.receiptRef}` });
}
