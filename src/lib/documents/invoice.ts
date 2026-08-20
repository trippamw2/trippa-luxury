// ─── Kivara Invoice Document ───────────────────────────────────────────

import { wrapDocument, documentHeader, documentBody, documentFooter, refBox, infoGrid } from "./template";

export interface InvoiceData {
  invoiceNumber: string;
  bookingRef: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  issueDate: string;
  dueDate: string;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount?: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  /** Payment reference for wire transfer (e.g. "KVR-20240818-A1B2C3D4-DEP"). */
  paymentReference?: string;
  /** PayPal payment link URL. */
  paypalLink?: string;
  /** Bank details for wire transfer. */
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban: string;
    swiftCode: string;
    routingNumber?: string;
    sortCode?: string;
    country?: string;
  };
}

function buildBankDetailsHtml(bank: NonNullable<InvoiceData["bankDetails"]>, reference: string): string {
  const rows: string[] = [];
  rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;width:160px;">Bank Name</td><td style="padding:8px 0;font-size:14px;font-weight:600;border-bottom:1px solid #EDE5DA;">${bank.bankName}</td></tr>`);
  rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Account Name</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #EDE5DA;">${bank.accountName}</td></tr>`);
  rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Account Number</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #EDE5DA;letter-spacing:1px;">${bank.accountNumber}</td></tr>`);
  if (bank.iban) rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">IBAN</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #EDE5DA;letter-spacing:1px;">${bank.iban}</td></tr>`);
  if (bank.swiftCode) rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">SWIFT / BIC</td><td style="padding:8px 0;font-size:14px;font-weight:600;border-bottom:1px solid #EDE5DA;letter-spacing:1px;">${bank.swiftCode}</td></tr>`);
  if (bank.routingNumber) rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Routing Number</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #EDE5DA;">${bank.routingNumber}</td></tr>`);
  if (bank.sortCode) rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Sort Code</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #EDE5DA;">${bank.sortCode}</td></tr>`);
  if (bank.country) rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Country</td><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #EDE5DA;">${bank.country}</td></tr>`);
  if (reference) rows.push(`<tr><td style="padding:8px 0;font-size:12px;color:#8B7D6B;border-bottom:1px solid #EDE5DA;">Payment Reference</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#C9A96E;border-bottom:1px solid #EDE5DA;letter-spacing:1px;">${reference}</td></tr>`);

  return `<div style="background:#F5F0EB;padding:20px;margin-bottom:24px;">
    <h3 style="font-size:14px;color:#1A1A1A;margin-bottom:12px;">Wire Transfer Details</h3>
    <p style="font-size:12px;color:#8B7D6B;margin-bottom:12px;">Please include the payment reference in your transfer description.</p>
    <table style="width:100%;">${rows.join("")}</table>
  </div>`;
}

export function generateInvoiceDocument(inv: InvoiceData): string {
  const itemsRows = inv.lineItems.map(item => `
    <tr>
      <td>${item.description}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">${inv.currency} ${item.unitPrice.toLocaleString()}</td>
      <td class="text-right font-bold">${inv.currency} ${item.total.toLocaleString()}</td>
    </tr>`).join("");

  // Build payment options section
  const paymentOptionsHtml: string[] = [];

  if (inv.bankDetails) {
    paymentOptionsHtml.push(buildBankDetailsHtml(inv.bankDetails, inv.paymentReference || ""));
  }

  if (inv.paypalLink) {
    paymentOptionsHtml.push(`
      <div style="background:#F5F0EB;padding:20px;margin-bottom:24px;">
        <h3 style="font-size:14px;color:#1A1A1A;margin-bottom:8px;">Pay Online with PayPal</h3>
        <p style="font-size:12px;color:#8B7D6B;margin-bottom:12px;">For a quick and secure payment, use the link below:</p>
        <a href="${inv.paypalLink}" style="display:inline-block;padding:12px 24px;background:#C9A96E;color:#1A1A1A;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:1px;">Pay Now with PayPal</a>
      </div>
    `);
  }

  const paymentSection = paymentOptionsHtml.length > 0
    ? paymentOptionsHtml.join("")
    : `<p style="font-size:12px;color:#8B7D6B;">Payment is due by ${inv.dueDate}. Please remit payment via bank transfer or the secure payment link provided separately.</p>`;

  const html = `
    ${documentHeader({ title: "Invoice", reference: inv.invoiceNumber, clientName: inv.clientName })}
    ${documentBody(`
      <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
        <div>
          <h1>Invoice</h1>
          <p style="color: #8B7D6B;">Booking Reference: <strong>${inv.bookingRef}</strong></p>
        </div>
        <div class="text-right">
          <p style="font-size: 11px; color: #8B7D6B;">Issue Date: ${inv.issueDate}</p>
          <p style="font-size: 11px; color: #8B7D6B;">Due Date: <strong>${inv.dueDate}</strong></p>
        </div>
      </div>

      ${refBox("Invoice Number", inv.invoiceNumber)}

      ${infoGrid([
        { label: "Bill To", value: inv.clientName },
        { label: "Email", value: inv.clientEmail },
        { label: "Booking Ref", value: inv.bookingRef },
        { label: "Currency", value: inv.currency },
      ])}

      <h3>Services Rendered</h3>
      <table>
        <thead>
          <tr><th>Description</th><th class="text-center">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr>
        </thead>
        <tbody>${itemsRows}</tbody>
        <tfoot>
          <tr><td colspan="3" class="text-right" style="padding: 8px; font-size: 13px; color: #8B7D6B;">Subtotal</td><td class="text-right" style="padding: 8px; font-size: 14px;">${inv.currency} ${inv.subtotal.toLocaleString()}</td></tr>
          ${inv.discountAmount ? `<tr><td colspan="3" class="text-right" style="padding: 4px 8px; font-size: 13px; color: #8B7D6B;">Discount</td><td class="text-right" style="padding: 4px 8px; font-size: 14px; color: #B8944A;">-${inv.currency} ${inv.discountAmount.toLocaleString()}</td></tr>` : ""}
          <tr><td colspan="3" class="text-right" style="padding: 4px 8px; font-size: 13px; color: #8B7D6B;">Tax (${inv.taxRate}%)</td><td class="text-right" style="padding: 4px 8px; font-size: 14px;">${inv.currency} ${inv.taxAmount.toLocaleString()}</td></tr>
          <tr class="total-row"><td colspan="3" class="text-right" style="padding: 16px 8px; font-size: 16px; font-weight: 700;">Total Due</td><td class="text-right" style="padding: 16px 8px; font-size: 22px; font-weight: 700; color: #C9A96E;">${inv.currency} ${inv.totalAmount.toLocaleString()}</td></tr>
        </tfoot>
      </table>

      ${inv.notes ? `<div style="background: #F5F0EB; padding: 16px; margin-bottom: 24px;"><p style="font-size: 12px; color: #8B7D6B; margin: 0;">${inv.notes}</p></div>` : ""}

      <h3>How to Pay</h3>
      ${paymentSection}

      <p style="font-size: 12px; color: #8B7D6B;">Payment is due by ${inv.dueDate}.</p>
      <p>Thank you for choosing Kivara.<br><strong style="color: #C9A96E;">The Kivara Team</strong></p>
    `)}
    ${documentFooter()}
  `;

  return wrapDocument(html, { title: `Invoice ${inv.invoiceNumber}` });
}
