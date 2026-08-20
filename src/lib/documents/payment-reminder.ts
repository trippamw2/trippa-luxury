// ─── Kivara Payment Reminder Document ──────────────────────────────────

import { wrapDocument, documentHeader, documentBody, documentFooter, refBox } from "./template";

export interface PaymentReminderData {
  clientName: string;
  bookingRef: string;
  amountDue: number;
  currency: string;
  dueDate: string;
  paymentType: string;
  paymentLink: string;
  /** Payment reference for wire transfer. */
  paymentReference?: string;
  /** Bank details for wire transfer. */
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban: string;
    swiftCode: string;
    country?: string;
  };
}

export function generatePaymentReminderDocument(data: PaymentReminderData): string {
  // Build payment options
  const paymentOptions: string[] = [];

  // PayPal option
  paymentOptions.push(`
    <div style="background:#F5F0EB;padding:20px;margin-bottom:16px;">
      <h3 style="font-size:14px;color:#1A1A1A;margin-bottom:8px;">Pay Online with PayPal</h3>
      <p style="font-size:12px;color:#8B7D6B;margin-bottom:12px;">Complete your payment instantly using PayPal:</p>
      <a href="${data.paymentLink}" style="display:inline-block;padding:12px 24px;background:#C9A96E;color:#1A1A1A;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:1px;">Pay Now with PayPal</a>
    </div>
  `);

  // Wire transfer option
  if (data.bankDetails) {
    const b = data.bankDetails;
    const bankRows: string[] = [];
    bankRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;width:140px;">Bank Name</td><td style="padding:6px 0;font-size:13px;font-weight:600;border-bottom:1px solid #EDE5DA;">${b.bankName}</td></tr>`);
    bankRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Account Name</td><td style="padding:6px 0;font-size:13px;border-bottom:1px solid #EDE5DA;">${b.accountName}</td></tr>`);
    bankRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Account Number</td><td style="padding:6px 0;font-size:13px;border-bottom:1px solid #EDE5DA;letter-spacing:1px;">${b.accountNumber}</td></tr>`);
    if (b.iban) bankRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">IBAN</td><td style="padding:6px 0;font-size:13px;border-bottom:1px solid #EDE5DA;letter-spacing:1px;">${b.iban}</td></tr>`);
    if (b.swiftCode) bankRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">SWIFT / BIC</td><td style="padding:6px 0;font-size:13px;font-weight:600;border-bottom:1px solid #EDE5DA;letter-spacing:1px;">${b.swiftCode}</td></tr>`);
    if (b.country) bankRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Country</td><td style="padding:6px 0;font-size:13px;border-bottom:1px solid #EDE5DA;">${b.country}</td></tr>`);
    if (data.paymentReference) bankRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Payment Reference</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#C9A96E;border-bottom:1px solid #EDE5DA;letter-spacing:1px;">${data.paymentReference}</td></tr>`);

    paymentOptions.push(`
      <div style="background:#F5F0EB;padding:20px;margin-bottom:16px;">
        <h3 style="font-size:14px;color:#1A1A1A;margin-bottom:8px;">Wire Transfer (SWIFT/IBAN)</h3>
        <p style="font-size:12px;color:#8B7D6B;margin-bottom:12px;">Please include the payment reference in your transfer description.</p>
        <table style="width:100%;">${bankRows.join("")}</table>
      </div>
    `);
  }

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

      <h3>How to Pay</h3>
      ${paymentOptions.join("")}

      <p>If you have already made this payment, please disregard this notice. Should you have any questions, your concierge is here to assist.</p>
      <p>Warmest regards,<br><strong style="color: #C9A96E;">The Kivara Finance Team</strong></p>
    `)}
    ${documentFooter()}
  `;
  return wrapDocument(html, { title: `Payment Reminder ${data.bookingRef}` });
}
