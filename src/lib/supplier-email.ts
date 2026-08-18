// ─── Kivara Supplier Email Templates ────────────────────────────────────
// Automated emails sent to suppliers on booking events.
// All prose uses the KIVARA brand voice for consistency.

import { emailShell } from "./email";

export interface SupplierEmailData {
  supplierName: string;
  clientName: string;
  bookingRef: string;
  destination: string;
  dates?: string;
  notes?: string;
}

/**
 * Notify supplier when a booking is confirmed.
 */
export function supplierBookingConfirmed(data: SupplierEmailData): {
  subject: string;
  htmlContent: string;
} {
  return {
    subject: `Booking Confirmed : ${data.bookingRef} : Kivara`,
    htmlContent: emailShell("Booking Confirmation", `
      <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Dear ${data.supplierName},</h2>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">We are pleased to confirm the following booking with your establishment. Please find the details below and kindly prepare for our guest's arrival.</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px; width: 120px;">Booking Ref</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${data.bookingRef}</td></tr>
        <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Guest</td><td style="padding: 8px 0; font-size: 14px;">${data.clientName}</td></tr>
        <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Destination</td><td style="padding: 8px 0; font-size: 14px;">${data.destination}</td></tr>
        ${data.dates ? `<tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Dates</td><td style="padding: 8px 0; font-size: 14px;">${data.dates}</td></tr>` : ""}
        ${data.notes ? `<tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Special Requests</td><td style="padding: 8px 0; font-size: 14px;">${data.notes}</td></tr>` : ""}
      </table>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">Should you have any questions or require additional information, please do not hesitate to reach out to us.</p>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">With warmest regards,<br><strong style="color: #C9A96E;">The Kivara Team</strong></p>
    `),
  };
}

/**
 * Notify supplier when a booking is updated.
 */
export function supplierBookingUpdated(data: SupplierEmailData & { changes?: string }): {
  subject: string;
  htmlContent: string;
} {
  return {
    subject: `Booking Updated : ${data.bookingRef} : Kivara`,
    htmlContent: emailShell("Booking Update", `
      <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Dear ${data.supplierName},</h2>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">Please note the following update to an existing booking with your establishment:</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px; width: 120px;">Booking Ref</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${data.bookingRef}</td></tr>
        <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Guest</td><td style="padding: 8px 0; font-size: 14px;">${data.clientName}</td></tr>
        <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Destination</td><td style="padding: 8px 0; font-size: 14px;">${data.destination}</td></tr>
        ${data.dates ? `<tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Dates</td><td style="padding: 8px 0; font-size: 14px;">${data.dates}</td></tr>` : ""}
        ${data.changes ? `<tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Changes</td><td style="padding: 8px 0; font-size: 14px;">${data.changes}</td></tr>` : ""}
      </table>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">With warmest regards,<br><strong style="color: #C9A96E;">The Kivara Team</strong></p>
    `),
  };
}

/**
 * Notify supplier when payment is received for a booking.
 */
export function supplierPaymentReceived(data: SupplierEmailData & {
  amount: string;
  paymentMethod?: string;
}): {
  subject: string;
  htmlContent: string;
} {
  return {
    subject: `Payment Received : ${data.bookingRef} : Kivara`,
    htmlContent: emailShell("Payment Received", `
      <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Dear ${data.supplierName},</h2>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">We are pleased to confirm that payment has been received for the following booking:</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px; width: 120px;">Booking Ref</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${data.bookingRef}</td></tr>
        <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Guest</td><td style="padding: 8px 0; font-size: 14px;">${data.clientName}</td></tr>
        <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Amount</td><td style="padding: 8px 0; font-size: 18px; font-weight: 700; color: #C9A96E;">${data.amount}</td></tr>
        ${data.paymentMethod ? `<tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Method</td><td style="padding: 8px 0; font-size: 14px;">${data.paymentMethod}</td></tr>` : ""}
      </table>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">With warmest regards,<br><strong style="color: #C9A96E;">The Kivara Team</strong></p>
    `),
  };
}
