// ─── Kivara Follow-up Engine (Brand Voice) ───────────────────────────────
// Post-trip client engagement — check-in, NPS, referral requests.
// All prose uses the KIVARA brand voice for emotional warmth and gratitude.

import {
  postTripDay1,
  postTripDay7,
  postTripDay30,
} from "@/lib/voice";

export type FollowUpType = "d1" | "d7" | "d30";

export interface FollowUpSchedule {
  type: FollowUpType;
  label: string;
  delayDays: number;
  sent: boolean;
  sentAt?: string;
  response?: string;
}

export interface FollowUpContent {
  subject: string;
  html: string;
  type: FollowUpType;
}

type ExtendedFollowUpSchedule = FollowUpSchedule & { dueDate: string; isDue: boolean };

export function generateFollowUpSchedules(travelEnd: string): ExtendedFollowUpSchedule[] {
  const end = new Date(travelEnd);
  const now = new Date();

  return [
    { type: "d1", label: "Day 1 Check-in", delayDays: 1, sent: false },
    { type: "d7", label: "Day 7 — NPS Survey", delayDays: 7, sent: false },
    { type: "d30", label: "Day 30 — Referral Request", delayDays: 30, sent: false },
  ].map((s) => {
    const dueDate = new Date(end);
    dueDate.setDate(dueDate.getDate() + s.delayDays);
    return {
      ...s,
      dueDate: dueDate.toISOString().split("T")[0],
      isDue: dueDate <= now && !s.sent,
    };
  }) as (FollowUpSchedule & { dueDate: string; isDue: boolean })[];
}

function emailHtml(bodyContent: string): string {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF7F2; color: #1A1A1A;">
      <div style="background: #1A1A1A; padding: 24px 40px; text-align: center;">
        <h1 style="font-family: 'Times New Roman', serif; color: #D4BC8A; font-size: 20px; margin: 0; letter-spacing: 2px;">KIVARA</h1>
      </div>
      <div style="padding: 32px 40px;">
        ${bodyContent}
      </div>
      <div style="background: #EDE5DA; padding: 16px 40px; text-align: center;">
        <p style="font-size: 10px; color: #8B7D6B; margin: 0;">Kivara Luxury Travel — concierge@kivara.luxury</p>
      </div>
    </div>`;
}

export class FollowUpEngine {
  generateFollowUp(
    type: FollowUpType,
    clientName: string,
    destination: string
  ): FollowUpContent {
    const templates: Record<FollowUpType, { subject: string; body: string }> = {
      d1: {
        subject: `Welcome Home, ${clientName} — How Was Your Journey?`,
        body: `
          <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Welcome home, ${clientName}</h2>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">${postTripDay1(clientName, destination).replace(/^Dear [^,]*, /, "")}</p>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">Simply reply to this email. We treasure every word.</p>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 16px 0 0;">With warmest regards,<br><strong style="color: #C9A96E;">Your Kivara Team</strong></p>
        `,
      },
      d7: {
        subject: `Share Your Kivara Experience — A Thoughtful Request`,
        body: `
          <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">We value your perspective, ${clientName}</h2>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">${postTripDay7(clientName, destination).replace(/^Dear [^,]*, /, "")}</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/review" style="display: inline-block; padding: 12px 32px; background: #1A1A1A; color: #FAF7F2; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Share Your Reflection</a>
          </div>
          <p style="font-size: 13px; color: #8B7D6B; line-height: 1.6; margin: 0;">Alternatively, simply reply to this email with your thoughts.</p>
        `,
      },
      d30: {
        subject: `Do You Know Someone Who Deserves the Kivara Experience?`,
        body: `
          <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">A month since ${destination}, ${clientName}</h2>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">${postTripDay30(clientName, destination).replace(/^Dear [^,]*, /, "")}</p>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">As a token of our gratitude, referred bookings include a special amenity on your next journey with us.</p>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">With gratitude,<br><strong style="color: #C9A96E;">Your Kivara Team</strong></p>
        `,
      },
    };

    const tpl = templates[type];

    return {
      type,
      subject: tpl.subject,
      html: emailHtml(tpl.body),
    };
  }
}

export const followUpEngine = new FollowUpEngine();
