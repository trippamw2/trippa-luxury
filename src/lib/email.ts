import { BrevoClient } from "@getbrevo/brevo";
import { formatDestination } from "@/lib/utils";

let client: BrevoClient | null = null;

function getClient(): BrevoClient {
  if (!client) {
    client = new BrevoClient({
      apiKey: process.env.NEXT_BREVO_KEY || "",
    });
  }
  return client;
}

interface EmailAddress {
  email: string;
  name?: string;
}

interface EmailParams {
  to: EmailAddress[];
  subject: string;
  htmlContent: string;
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
}

const FROM_EMAIL = "concierge@trippa.luxury";
const FROM_NAME = "Trippa Concierge";

export async function sendEmail(params: EmailParams) {
  try {
    const instance = getClient();
    const payload = {
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      replyTo: params.replyTo || { email: FROM_EMAIL, name: FROM_NAME },
      to: params.to,
      subject: params.subject,
      htmlContent: params.htmlContent,
      ...(params.cc?.length ? { cc: params.cc } : {}),
      ...(params.bcc?.length ? { bcc: params.bcc } : {}),
    };

    const response = await instance.transactionalEmails.sendTransacEmail(payload);
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error("Brevo email error:", error);
    throw error;
  }
}

// ─── TEMPLATES ──────────────────────────────────────────────────────────

export function newInquiryEmail(data: {
  fullName: string;
  email: string;
  phone?: string;
  destination?: string;
  preferredDates?: string;
  guests?: number;
  message: string;
}) {
  return {
    subject: `New Inquiry from ${data.fullName} — Trippa Luxury Travel`,
    htmlContent: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
        <div style="background: #1A1A1A; padding: 32px 40px; text-align: center;">
          <h1 style="font-family: 'Playfair Display', serif; color: #D4BC8A; font-size: 24px; margin: 0; letter-spacing: 2px;">Trippa</h1>
          <p style="color: #A89880; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 4px 0 0;">New Inquiry Received</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 24px;">A new traveler has reached out</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px 0; color: #8B7D6B; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; width: 120px;">Name</td><td style="padding: 10px 0; font-size: 14px;">${data.fullName}</td></tr>
            <tr><td style="padding: 10px 0; color: #8B7D6B; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</td><td style="padding: 10px 0; font-size: 14px;"><a href="mailto:${data.email}" style="color: #C9A96E;">${data.email}</a></td></tr>
            ${data.phone ? `<tr><td style="padding: 10px 0; color: #8B7D6B; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Phone</td><td style="padding: 10px 0; font-size: 14px;">${data.phone}</td></tr>` : ""}
            ${data.destination ? `<tr><td style="padding: 10px 0; color: #8B7D6B; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Destination</td><td style="padding: 10px 0; font-size: 14px; text-transform: capitalize;">${formatDestination(data.destination)}</td></tr>` : ""}
            ${data.preferredDates ? `<tr><td style="padding: 10px 0; color: #8B7D6B; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Preferred Dates</td><td style="padding: 10px 0; font-size: 14px;">${data.preferredDates}</td></tr>` : ""}
            ${data.guests ? `<tr><td style="padding: 10px 0; color: #8B7D6B; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Guests</td><td style="padding: 10px 0; font-size: 14px;">${data.guests}</td></tr>` : ""}
          </table>
          <div style="margin-top: 24px; padding: 20px; background: #F5F0EB; border-left: 3px solid #C9A96E;">
            <p style="font-size: 12px; color: #8B7D6B; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Message</p>
            <p style="font-size: 14px; color: #1A1A1A; line-height: 1.6; margin: 0;">${data.message}</p>
          </div>
          <div style="margin-top: 32px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/inquiries" style="display: inline-block; padding: 12px 32px; background: #1A1A1A; color: #FAF7F2; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">View in Admin Panel</a>
          </div>
        </div>
        <div style="background: #EDE5DA; padding: 20px 40px; text-align: center;">
          <p style="font-size: 11px; color: #8B7D6B; margin: 0;">Trippa Luxury Travel — Curating Africa's Finest Romance Escapes</p>
        </div>
      </div>
    `,
  };
}

export function inquiryConfirmationEmail(data: {
  fullName: string;
  destination?: string;
}) {
  return {
    subject: "Thank You — Your Trippa Inquiry Has Been Received",
    htmlContent: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
        <div style="background: #1A1A1A; padding: 32px 40px; text-align: center;">
          <h1 style="font-family: 'Playfair Display', serif; color: #D4BC8A; font-size: 24px; margin: 0; letter-spacing: 2px;">Trippa</h1>
          <p style="color: #A89880; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 4px 0 0;">Your Journey Begins</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Dear ${data.fullName},</h2>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">Thank you for reaching out to Trippa. Your inquiry has been received with care, and our concierge team is already reviewing the details to craft the perfect escape for you.</p>
          ${data.destination ? `<p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">We are thrilled that you are considering <strong style="color: #C9A96E;">${formatDestination(data.destination)}</strong> for your romantic journey. It is a choice you will treasure forever.</p>` : ""}
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 24px;">A member of our team will respond within <strong>24 hours</strong> with a personalized itinerary and availability.</p>
          <div style="background: #F5F0EB; padding: 24px; border-left: 3px solid #C9A96E; margin-bottom: 24px;">
            <p style="font-size: 11px; color: #8B7D6B; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">In the meantime</p>
            <p style="font-size: 13px; color: #4A4A4A; line-height: 1.6; margin: 0;">Browse our <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/journal" style="color: #C9A96E;">Journal</a> for travel inspiration, or reach out to us directly on <a href="https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""}" style="color: #C9A96E;">WhatsApp</a> for immediate assistance.</p>
          </div>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">Warmest regards,<br><strong style="color: #C9A96E;">The Trippa Concierge Team</strong></p>
        </div>
        <div style="background: #EDE5DA; padding: 20px 40px; text-align: center;">
          <p style="font-size: 11px; color: #8B7D6B; margin: 0;">Trippa Luxury Travel — Curating Africa's Finest Romance Escapes</p>
        </div>
      </div>
    `,
  };
}

export function newBookingNotification(data: {
  bookingRef: string;
  clientName: string;
  destination?: string;
  startDate?: string;
  totalAmount?: string;
}) {
  return {
    subject: `New Booking ${data.bookingRef} — ${data.clientName}`,
    htmlContent: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
        <div style="background: #1A1A1A; padding: 32px 40px; text-align: center;">
          <h1 style="font-family: 'Playfair Display', serif; color: #D4BC8A; font-size: 24px; margin: 0; letter-spacing: 2px;">Trippa</h1>
          <p style="color: #A89880; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 4px 0 0;">New Booking Confirmed</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 8px;">New Booking: ${data.bookingRef}</h2>
          <p style="font-size: 14px; color: #4A4A4A; margin: 0 0 24px;">A new booking has been created.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Reference</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${data.bookingRef}</td></tr>
            <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Client</td><td style="padding: 8px 0; font-size: 14px;">${data.clientName}</td></tr>
            ${data.destination ? `<tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Destination</td><td style="padding: 8px 0; font-size: 14px;">${data.destination}</td></tr>` : ""}
            ${data.startDate ? `<tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Start Date</td><td style="padding: 8px 0; font-size: 14px;">${data.startDate}</td></tr>` : ""}
            ${data.totalAmount ? `<tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Total</td><td style="padding: 8px 0; font-size: 14px;">${data.totalAmount}</td></tr>` : ""}
          </table>
          <div style="margin-top: 32px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/bookings" style="display: inline-block; padding: 12px 32px; background: #1A1A1A; color: #FAF7F2; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">View Booking</a>
          </div>
        </div>
        <div style="background: #EDE5DA; padding: 20px 40px; text-align: center;">
          <p style="font-size: 11px; color: #8B7D6B; margin: 0;">Trippa Luxury Travel</p>
        </div>
      </div>
    `,
  };
}

export function newsletterWelcomeEmail() {
  return {
    subject: "Welcome to Trippa — Africa's Finest Romance Escapes",
    htmlContent: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
        <div style="background: #1A1A1A; padding: 32px 40px; text-align: center;">
          <h1 style="font-family: 'Playfair Display', serif; color: #D4BC8A; font-size: 24px; margin: 0; letter-spacing: 2px;">Trippa</h1>
          <p style="color: #A89880; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 4px 0 0;">Welcome to the Journey</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Welcome to Trippa</h2>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">Thank you for subscribing. You are now part of an intimate community of travelers who seek the extraordinary.</p>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">Expect curated stories, exclusive offers, and a glimpse into Africa's most romantic escapes delivered to your inbox.</p>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">Warmest regards,<br><strong style="color: #C9A96E;">The Trippa Team</strong></p>
        </div>
        <div style="background: #EDE5DA; padding: 20px 40px; text-align: center;">
          <p style="font-size: 11px; color: #8B7D6B; margin: 0;">Trippa Luxury Travel</p>
        </div>
      </div>
    `,
  };
}

export function paymentReceiptEmail(data: {
  clientName: string;
  amount: string;
  bookingRef: string;
  paymentMethod?: string;
}) {
  return {
    subject: `Payment Receipt — ${data.bookingRef} — Trippa`,
    htmlContent: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
        <div style="background: #1A1A1A; padding: 32px 40px; text-align: center;">
          <h1 style="font-family: 'Playfair Display', serif; color: #D4BC8A; font-size: 24px; margin: 0; letter-spacing: 2px;">Trippa</h1>
          <p style="color: #A89880; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 4px 0 0;">Payment Received</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Thank you, ${data.clientName}</h2>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 24px;">We have received your payment of <strong style="color: #C9A96E; font-size: 18px;">${data.amount}</strong> for booking <strong>${data.bookingRef}</strong>.</p>
          ${data.paymentMethod ? `<p style="font-size: 13px; color: #8B7D6B; margin: 0 0 24px;">Payment method: ${data.paymentMethod}</p>` : ""}
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">Your journey is one step closer. Our team is curating every detail to ensure your experience is nothing short of extraordinary.</p>
        </div>
        <div style="background: #EDE5DA; padding: 20px 40px; text-align: center;">
          <p style="font-size: 11px; color: #8B7D6B; margin: 0;">Trippa Luxury Travel</p>
        </div>
      </div>
    `,
  };
}
