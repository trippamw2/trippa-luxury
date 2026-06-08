// ─── Kivara Payment Engine (Brand Voice) ─────────────────────────────────
// Generates payment links, receipts, and payment communications.
// All guest-facing prose uses the KIVARA brand voice.

export interface PaymentLinkData {
  bookingRef: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  type: "deposit" | "balance" | "full";
  dueDate: string;
  paymentUrl: string;
  description: string;
}

export interface ReceiptData {
  receiptRef: string;
  bookingRef: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paidAt: string;
  type: "deposit" | "balance" | "full";
  balanceRemaining?: number;
}

export class PaymentEngine {
  /**
   * Generate a payment link for a booking.
   */
  generatePaymentLink(data: Omit<PaymentLinkData, "paymentUrl">): PaymentLinkData {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const paymentUrl = `${baseUrl}/api/payment/process?ref=${data.bookingRef}&type=${data.type}&amount=${data.amount}`;

    return { ...data, paymentUrl };
  }

  /**
   * Generate the payment link email HTML with KIVARA brand voice.
   */
  generatePaymentLinkHtml(link: PaymentLinkData): string {
    const label = link.type === "deposit" ? "deposit to secure your reservation" : link.type === "balance" ? "final balance" : "total investment";

    return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
      <div style="background: #1A1A1A; padding: 32px 40px; text-align: center;">
        <h1 style="font-family: 'Times New Roman', serif; color: #D4BC8A; font-size: 24px; margin: 0; letter-spacing: 2px;">KIVARA</h1>
        <p style="color: #A89880; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 4px 0 0;">Payment Reserved</p>
      </div>
      <div style="padding: 40px;">
        <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">${link.clientName},</h2>
        <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 8px;">Your journey proposal for booking <strong>${link.bookingRef}</strong> remains reserved pending a ${label} of <strong style="color: #C9A96E; font-size: 22px;">${link.currency} ${link.amount.toLocaleString()}</strong>.</p>
        <p style="font-size: 13px; color: #8B7D6B; margin: 0 0 24px;">Due by: ${link.dueDate}</p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${link.paymentUrl}" style="display: inline-block; padding: 14px 40px; background: #1A1A1A; color: #FAF7F2; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Complete Your Reservation</a>
        </div>
        <p style="font-size: 13px; color: #8B7D6B; line-height: 1.6; margin: 0;">Should you have any questions, your concierge is here to assist : simply reply to this email.</p>
        <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 16px 0 0;">With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
      </div>
      <div style="background: #EDE5DA; padding: 20px 40px; text-align: center;">
        <p style="font-size: 10px; color: #8B7D6B; margin: 0;">Kivara Luxury Travel : concierge@kivara.luxury</p>
      </div>
    </div>`;
  }

  /**
   * Generate receipt data and email HTML with KIVARA brand voice.
   */
  generateReceipt(data: Omit<ReceiptData, "receiptRef">): { receipt: ReceiptData; html: string } {
    const receipt: ReceiptData = {
      ...data,
      receiptRef: `RCP-${data.bookingRef}-${Date.now().toString(36).toUpperCase()}`,
    };

    const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
      <div style="background: #1A1A1A; padding: 32px 40px; text-align: center;">
        <h1 style="font-family: 'Times New Roman', serif; color: #D4BC8A; font-size: 24px; margin: 0; letter-spacing: 2px;">KIVARA</h1>
        <p style="color: #A89880; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 4px 0 0;">Payment Gracefully Received</p>
      </div>
      <div style="padding: 40px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 60px; height: 60px; background: #D4BC8A; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 28px; color: #1A1A1A;">✓</span>
          </div>
          <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 4px;">Thank you, ${receipt.clientName}</h2>
          <p style="font-size: 14px; color: #8B7D6B; margin: 0;">Your payment has been gracefully received.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr><td style="padding: 8px 0; font-size: 12px; color: #8B7D6B;">Receipt</td><td style="padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600; font-family: 'Courier New', monospace;">${receipt.receiptRef}</td></tr>
          <tr><td style="padding: 8px 0; font-size: 12px; color: #8B7D6B; border-top: 1px solid #EDE5DA;">Booking</td><td style="padding: 8px 0; font-size: 14px; text-align: right; border-top: 1px solid #EDE5DA;">${receipt.bookingRef}</td></tr>
          <tr><td style="padding: 8px 0; font-size: 12px; color: #8B7D6B; border-top: 1px solid #EDE5DA;">Amount</td><td style="padding: 8px 0; font-size: 18px; text-align: right; font-weight: 700; color: #C9A96E; border-top: 1px solid #EDE5DA;">${receipt.currency} ${receipt.amount.toLocaleString()}</td></tr>
          <tr><td style="padding: 8px 0; font-size: 12px; color: #8B7D6B; border-top: 1px solid #EDE5DA;">Method</td><td style="padding: 8px 0; font-size: 14px; text-align: right; border-top: 1px solid #EDE5DA;">${receipt.paymentMethod}</td></tr>
          <tr><td style="padding: 8px 0; font-size: 12px; color: #8B7D6B; border-top: 1px solid #EDE5DA;">Date</td><td style="padding: 8px 0; font-size: 14px; text-align: right; border-top: 1px solid #EDE5DA;">${new Date(receipt.paidAt).toLocaleDateString()}</td></tr>
          ${receipt.balanceRemaining ? `<tr><td style="padding: 8px 0; font-size: 12px; color: #8B7D6B; border-top: 1px solid #EDE5DA;">Balance Remaining</td><td style="padding: 8px 0; font-size: 14px; text-align: right; border-top: 1px solid #EDE5DA;">${receipt.currency} ${receipt.balanceRemaining.toLocaleString()}</td></tr>` : ""}
        </table>
        <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">Your journey is one step closer. Our team is curating every detail to ensure your experience is nothing short of remarkable.</p>
        <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 16px 0 0;">With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
      </div>
      <div style="background: #EDE5DA; padding: 20px 40px; text-align: center;">
        <p style="font-size: 10px; color: #8B7D6B; margin: 0;">Kivara Luxury Travel</p>
      </div>
    </div>`;

    return { receipt, html };
  }
}

export const paymentEngine = new PaymentEngine();
