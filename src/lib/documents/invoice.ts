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
}

export function generateInvoiceDocument(inv: InvoiceData): string {
  const itemsRows = inv.lineItems.map(item => `
    <tr>
      <td>${item.description}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">${inv.currency} ${item.unitPrice.toLocaleString()}</td>
      <td class="text-right font-bold">${inv.currency} ${item.total.toLocaleString()}</td>
    </tr>`).join("");

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

      <p style="font-size: 12px; color: #8B7D6B;">Payment is due by ${inv.dueDate}. Please remit payment via bank transfer or the secure payment link provided separately.</p>
      <p>Thank you for choosing Kivara.<br><strong style="color: #C9A96E;">The Kivara Team</strong></p>
    `)}
    ${documentFooter()}
  `;

  return wrapDocument(html, { title: `Invoice ${inv.invoiceNumber}` });
}
