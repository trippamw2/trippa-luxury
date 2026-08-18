// ─── Kivara Email System (Brand Voice Integrated) ───────────────────────
// All guest-facing emails use the KIVARA brand voice module for prose,
// signature, and emotional tone. Every template is crafted to feel
// refined, calm, and human-curated.

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

interface EmailAttachment {
  content: string; // base64-encoded content
  name: string;    // filename with extension
}

interface EmailParams {
  to: EmailAddress[];
  subject: string;
  htmlContent: string;
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  attachment?: EmailAttachment[];
}

const FROM_EMAIL = "concierge@kivara.luxury";
const FROM_NAME = "Kivara Concierge";

export async function sendEmail(params: EmailParams) {
  try {
    const instance = getClient();
    const payload: Record<string, unknown> = {
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      replyTo: params.replyTo || { email: FROM_EMAIL, name: FROM_NAME },
      to: params.to,
      subject: params.subject,
      htmlContent: params.htmlContent,
      ...(params.cc?.length ? { cc: params.cc } : {}),
      ...(params.bcc?.length ? { bcc: params.bcc } : {}),
    };

    if (params.attachment?.length) {
      payload.attachment = params.attachment.map((a) => ({
        content: a.content,
        name: a.name,
      }));
    }

    const response = await instance.transactionalEmails.sendTransacEmail(payload);
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error("Brevo email error:", error);
    throw error;
  }
}

// ─── Shared email shell ─────────────────────────────────────────────

export function emailShell(subjectLine: string, bodyHtml: string): string {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
      <div style="background: #1A1A1A; padding: 32px 40px; text-align: center;">
        <h1 style="font-family: 'Times New Roman', serif; color: #D4BC8A; font-size: 24px; margin: 0; letter-spacing: 2px;">Kivara</h1>
        <p style="color: #A89880; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 4px 0 0;">${subjectLine}</p>
      </div>
      <div style="padding: 40px;">
        ${bodyHtml}
      </div>
      <div style="background: #EDE5DA; padding: 20px 40px; text-align: center;">
        <p style="font-size: 10px; color: #8B7D6B; margin: 0;">Kivara Luxury Travel &mdash; Curating Africa's Finest Journeys</p>
        <p style="font-size: 9px; color: #8B7D6B; margin: 4px 0 0;">concierge@kivara.luxury</p>
      </div>
    </div>`;
}

// ─── TEMPLATES ──────────────────────────────────────────────────────

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
    subject: `New Inquiry from ${data.fullName} : Kivara Luxury Travel`,
    htmlContent: emailShell("New Inquiry Received", `
      <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 24px;">A new traveler has reached out</h2>
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
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/inquiries" style="display: inline-block; padding: 12px 32px; background: #1A1A1A; color: #FAF7F2; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">View in Admin Panel</a>
      </div>
    `),
  };
}

export function inquiryConfirmationEmail(data: {
  fullName: string;
  destination?: string;
}) {
  return {
    subject: "Your Inquiry Has Been Received with Care : Kivara Luxury Travel",
    htmlContent: emailShell("Your Journey Begins", `
      <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">${data.fullName},</h2>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">Thank you for reaching out to Kivara. Your inquiry has been received with the attention it deserves, and our concierge team is already beginning to understand the contours of your perfect escape.</p>
      ${data.destination ? `<p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">We are delighted that you are considering <strong style="color: #C9A96E;">${formatDestination(data.destination)}</strong> : a choice that promises memories to treasure for a lifetime.</p>` : ""}
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 24px;">You can expect a thoughtfully curated response from your personal concierge within <strong>24 hours</strong>, complete with a first glimpse of what your journey could hold.</p>
      <div style="background: #F5F0EB; padding: 24px; border-left: 3px solid #C9A96E; margin-bottom: 24px;">
        <p style="font-size: 11px; color: #8B7D6B; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">In the meantime</p>
        <p style="font-size: 13px; color: #4A4A4A; line-height: 1.6; margin: 0;">Browse our <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/journal" style="color: #C9A96E;">Journal</a> for travel inspiration, or reach out to us directly on <a href="https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ""}" style="color: #C9A96E;">WhatsApp</a> for immediate assistance.</p>
      </div>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
    `),
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
    subject: `New Booking ${data.bookingRef} : ${data.clientName}`,
    htmlContent: emailShell("New Booking Confirmed", `
      <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 8px;">New Booking: ${data.bookingRef}</h2>
      <p style="font-size: 14px; color: #4A4A4A; margin: 0 0 24px;">A new journey has been thoughtfully reserved.</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Reference</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${data.bookingRef}</td></tr>
        <tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Client</td><td style="padding: 8px 0; font-size: 14px;">${data.clientName}</td></tr>
        ${data.destination ? `<tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Destination</td><td style="padding: 8px 0; font-size: 14px;">${data.destination}</td></tr>` : ""}
        ${data.startDate ? `<tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Start Date</td><td style="padding: 8px 0; font-size: 14px;">${data.startDate}</td></tr>` : ""}
        ${data.totalAmount ? `<tr><td style="padding: 8px 0; color: #8B7D6B; font-size: 12px;">Total Investment</td><td style="padding: 8px 0; font-size: 14px;">${data.totalAmount}</td></tr>` : ""}
      </table>
      <div style="margin-top: 32px; text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/bookings" style="display: inline-block; padding: 12px 32px; background: #1A1A1A; color: #FAF7F2; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">View Booking</a>
      </div>
    `),
  };
}

export function newsletterWelcomeEmail() {
  return {
    subject: "Welcome to Kivara : Africa's Finest Curated Journeys",
    htmlContent: emailShell("Welcome to the Journey", `
      <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Welcome to Kivara</h2>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">Thank you for subscribing. You are now part of an intimate community of travelers who seek the remarkable : those who understand that the finest journeys are felt, not merely seen.</p>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">Expect curated stories, behind-the-scenes insights, and a glimpse into Africa's most soul-stirring escapes delivered to your inbox.</p>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">With warmest regards,<br><strong style="color: #C9A96E;">The Kivara Team</strong></p>
    `),
  };
}

/**
 * Admin-composed newsletter campaign. `bodyHtml` is the staff-written HTML
 * (paragraph-safe), rendered inside the Kivara shell.
 */
export function newsletterCampaignEmail(data: { subject: string; bodyHtml: string }) {
  return {
    subject: data.subject,
    htmlContent: emailShell("The Kivara Edit", `
      <div style="font-size: 14px; color: #4A4A4A; line-height: 1.7;">
        ${data.bodyHtml}
      </div>
      <div style="margin-top: 32px; padding: 16px; background: #F5F0EB; border-left: 3px solid #C9A96E;">
        <p style="font-size: 12px; color: #8B7D6B; margin: 0;">
          Prefer not to hear from us? Reply with "unsubscribe" and we will remove you from the list.
        </p>
      </div>
    `),
  };
}

export function quoteEmail(data: {
  clientName: string;
  quoteRef: string;
  htmlContent: string;
}) {
  return {
    subject: `Your Curated Journey : ${data.quoteRef} : Kivara Luxury Travel`,
    htmlContent: data.htmlContent,
  };
}

/**
 * Concierge reply to an inquiry. `replyHtml` is the staff-written message,
 * rendered as-is inside the Kivara shell (multi-line safe).
 */
export function inquiryReplyEmail(data: {
  clientName: string;
  replyHtml: string;
}) {
  return {
    subject: `Re: Your Journey Inquiry : Kivara Luxury Travel`,
    htmlContent: emailShell("Your Personal Concierge", `
      <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Dear ${data.clientName},</h2>
      <div style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 24px;">
        ${data.replyHtml}
      </div>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
      <div style="margin-top: 24px; padding: 16px; background: #F5F0EB; border-left: 3px solid #C9A96E;">
        <p style="font-size: 12px; color: #8B7D6B; margin: 0;">Simply reply to this email to continue the conversation, or reach us on WhatsApp at any time.</p>
      </div>
    `),
  };
}

export function paymentLinkEmail(data: {
  clientName: string;
  bookingRef: string;
  amount: string;
  paymentUrl: string;
  type: string;
}) {
  const label = data.type === "deposit" ? "deposit" : data.type === "balance" ? "balance" : "full";
  return {
    subject: `Payment Reserved : ${data.bookingRef} : Kivara Luxury Travel`,
    htmlContent: emailShell("Payment Reserved", `
      <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">${data.clientName},</h2>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">Your journey proposal for booking <strong>${data.bookingRef}</strong> remains reserved pending a ${label} payment of <strong style="color: #C9A96E; font-size: 18px;">${data.amount}</strong>. Once received, we will proceed with finalising every element of your itinerary.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.paymentUrl}" style="display: inline-block; padding: 14px 40px; background: #1A1A1A; color: #FAF7F2; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Complete Your Reservation</a>
      </div>
      <p style="font-size: 13px; color: #8B7D6B; line-height: 1.6; margin: 0;">Should you have any questions, your concierge is here to assist : simply reply to this email.</p>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 16px 0 0;">With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
    `),
  };
}

export function reminderEmail(data: {
  clientName: string;
  subject: string;
  htmlContent: string;
}) {
  return {
    subject: data.subject,
    htmlContent: data.htmlContent,
  };
}

export function followUpEmail(data: {
  clientName: string;
  subject: string;
  htmlContent: string;
}) {
  return {
    subject: data.subject,
    htmlContent: data.htmlContent,
  };
}

export function paymentReceiptEmail(data: {
  clientName: string;
  amount: string;
  bookingRef: string;
  paymentMethod?: string;
}) {
  return {
    subject: `Payment Gracefully Received : ${data.bookingRef} : Kivara`,
    htmlContent: emailShell("Payment Received", `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 60px; height: 60px; background: #D4BC8A; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 28px; color: #1A1A1A;">✓</span>
        </div>
        <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 4px;">Thank you, ${data.clientName}</h2>
        <p style="font-size: 14px; color: #8B7D6B; margin: 0;">Your payment has been gracefully received.</p>
      </div>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 24px;">We have received your payment of <strong style="color: #C9A96E; font-size: 18px;">${data.amount}</strong> for booking <strong>${data.bookingRef}</strong>.</p>
      ${data.paymentMethod ? `<p style="font-size: 13px; color: #8B7D6B; margin: 0 0 24px;">Payment method: ${data.paymentMethod}</p>` : ""}
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">Your journey is one step closer. Our team is curating every detail to ensure your experience is nothing short of remarkable.</p>
      <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 16px 0 0;">With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Concierge</strong></p>
    `),
  };
}
