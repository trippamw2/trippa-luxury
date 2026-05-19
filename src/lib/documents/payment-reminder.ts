// ─── Kivara Payment Reminder Document ──────────────────────────────────

import { wrapDocument, documentHeader, documentBody, documentFooter, refBox } from "./template";

export function generatePaymentReminderDocument(data: {
  clientName: string;
  bookingRef: string;
  amountDue: number;
  currency: string;
  dueDate: string;
  paymentType: string;
  paymentLink: string;
}): string {
  const html = `
    ${documentHeader({ title: "Payment Reminder", reference: data.bookingRef, clientName: data.clientName })}
    ${documentBody(`
      <h1>Payment Reminder</h1>
      <p>Dear ${data.clientName}, this is a friendly reminder regarding the upcoming payment for your Kivara journey.</p>

      ${refBox("Booking Reference", data.bookingRef)}

      <table style="margin-bottom: 24px;">
        <tr><td style="padding: 10px 0; font-size: 12px; color: #8B7D6B; border-bottom: 1px solid #EDE5DA; width: 140px;">Amount Due</td><td style="padding: 10px 0; font-size: 22px; font-weight: 700; color: #C9A96E; border-bottom: 1px solid #EDE5DA;">${data.currency} ${data.amountDue.toLocaleString()}</td></tr>
        <tr><td style="padding: 10px 0; font-size: 12px; color: #8B7D6B; border-bottom: 1px solid #EDE5DA;">Payment Type</td><td style="padding: 10px 0; font-size: 14px; text-transform: capitalize; border-bottom: 1px solid #EDE5DA;">${data.paymentType}</td></tr>
        <tr><td style="padding: 10px 0; font-size: 12px; color: #8B7D6B; border-bottom: 1px solid #EDE5DA;">Due Date</td><td style="padding: 10px 0; font-size: 14px; font-weight: 600; border-bottom: 1px solid #EDE5DA;">${data.dueDate}</td></tr>
      </table>

      <div style="text-align: center; margin: 32px 0;">
        <p style="font-size: 13px; color: #8B7D6B; margin-bottom: 16px;">To complete your payment securely, please use the link below:</p>
        <p style="font-size: 12px; color: #C9A96E; word-break: break-all;">${data.paymentLink}</p>
      </div>

      <p>If you have already made this payment, please disregard this notice. Should you have any questions, your concierge is here to assist.</p>
      <p>Warmest regards,<br><strong style="color: #C9A96E;">The Kivara Finance Team</strong></p>
    `)}
    ${documentFooter()}
  `;
  return wrapDocument(html, { title: `Payment Reminder ${data.bookingRef}` });
}
