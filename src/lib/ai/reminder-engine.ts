// ─── Kivara Reminder Engine (Brand Voice) ────────────────────────────────
// Schedules and generates pre-trip reminder communications.
// All prose uses the KIVARA brand voice for emotional warmth and luxury tone.

import {
  preTrip30,
  preTrip14,
  preTrip7,
  preTrip1,
  dayOfTravel,
} from "@/lib/voice";

export interface ReminderSchedule {
  type: "n30" | "n14" | "n7" | "n1" | "day-of";
  label: string;
  daysBefore: number;
  sent: boolean;
  sentAt?: string;
}

export interface ReminderContent {
  subject: string;
  html: string;
}

type ExtendedReminderSchedule = ReminderSchedule & { dueDate: string; isDue: boolean };

export function generateReminderSchedules(travelStart: string): ExtendedReminderSchedule[] {
  const start = new Date(travelStart);
  const now = new Date();

  return [
    { type: "n30", label: "30-Day Pre-Trip", daysBefore: 30, sent: false, sentAt: undefined },
    { type: "n14", label: "14-Day Pre-Trip", daysBefore: 14, sent: false, sentAt: undefined },
    { type: "n7", label: "7-Day Pre-Trip", daysBefore: 7, sent: false, sentAt: undefined },
    { type: "n1", label: "1-Day Pre-Trip", daysBefore: 1, sent: false, sentAt: undefined },
    { type: "day-of", label: "Day of Travel", daysBefore: 0, sent: false, sentAt: undefined },
  ].map((s) => {
    const dueDate = new Date(start);
    dueDate.setDate(dueDate.getDate() - s.daysBefore);
    return {
      ...s,
      dueDate: dueDate.toISOString().split("T")[0],
      isDue: dueDate <= now && !s.sent,
    };
  }) as (ReminderSchedule & { dueDate: string; isDue: boolean })[];
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
        <p style="font-size: 10px; color: #8B7D6B; margin: 0;">Kivara Luxury Travel : concierge@kivara.luxury</p>
      </div>
    </div>`;
}

export class ReminderEngine {
  generateReminder(
    type: ReminderSchedule["type"],
    clientName: string,
    destination: string,
    travelStart: string,
    bookingRef: string
  ): ReminderContent {
    const templates: Record<ReminderSchedule["type"], { subject: string; body: string }> = {
      "n30": {
        subject: `Your Kivara Journey : ${destination} Awaits`,
        body: `
          <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Your journey approaches, ${clientName}</h2>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">${preTrip30(clientName, destination).replace(/^Dear [^,]*, /, "")}</p>
          <div style="background: #F5F0EB; padding: 16px; margin-bottom: 16px; border-left: 3px solid #C9A96E;">
            <p style="font-size: 12px; color: #8B7D6B; margin: 0 0 2px;">Booking Reference</p>
            <p style="font-size: 16px; font-weight: 600; color: #1A1A1A; font-family: 'Courier New', monospace; margin: 0;">${bookingRef}</p>
          </div>
          <p style="font-size: 12px; color: #8B7D6B; margin: 0;">Travel Date: ${travelStart}</p>
        `,
      },
      "n14": {
        subject: `${destination} : Your Journey Takes Shape`,
        body: `
          <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Two weeks until ${destination}, ${clientName}</h2>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">${preTrip14(clientName, destination).replace(/^Dear [^,]*, /, "")}</p>
          <div style="background: #F5F0EB; padding: 16px; margin-bottom: 16px;">
            <p style="font-size: 10px; color: #8B7D6B; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">To Prepare</p>
            <ul style="font-size: 13px; color: #4A4A4A; line-height: 1.8; margin: 0; padding-left: 16px;">
              <li>Check passport validity (6+ months recommended)</li>
              <li>Arrange travel insurance</li>
              <li>Prepare any visa applications</li>
              <li>Review accommodation preferences</li>
            </ul>
          </div>
          <p style="font-size: 13px; color: #8B7D6B; margin: 0;">Your final itinerary will be delivered in the coming days.</p>
        `,
      },
      "n7": {
        subject: `Final Preparations for ${destination}`,
        body: `
          <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">One week to go, ${clientName}</h2>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">${preTrip7(clientName, destination).replace(/^Dear [^,]*, /, "")}</p>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">Your concierge has arranged every transfer, every reservation, every experience. All that remains is for you to arrive and surrender to the journey.</p>
        `,
      },
      "n1": {
        subject: `Tomorrow You Depart for ${destination} ✦`,
        body: `
          <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Tomorrow is the day, ${clientName}</h2>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">${preTrip1(clientName, destination).replace(/^Dear [^,]*, /, "")}</p>
          <div style="background: #F5F0EB; padding: 16px; margin-bottom: 16px; border-left: 3px solid #C9A96E;">
            <p style="font-size: 12px; color: #1A1A1A; margin: 0 0 4px;"><strong>Destination:</strong> ${destination}</p>
            <p style="font-size: 12px; color: #1A1A1A; margin: 0 0 4px;"><strong>Arrival:</strong> ${travelStart}</p>
            <p style="font-size: 12px; color: #1A1A1A; margin: 0;"><strong>Booking Ref:</strong> ${bookingRef}</p>
          </div>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">Your Kivara concierge is on standby throughout your travels. Simply arrive, breathe, and let Africa work its quiet magic.</p>
        `,
      },
      "day-of": {
        subject: `Welcome to ${destination} : Your Kivara Journey Begins`,
        body: `
          <h2 style="font-family: 'Times New Roman', serif; font-size: 20px; color: #1A1A1A; margin: 0 0 16px;">Welcome to ${destination}, ${clientName}</h2>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0 0 16px;">${dayOfTravel(clientName, destination).replace(/^Dear [^,]*, /, "")}</p>
          <p style="font-size: 14px; color: #4A4A4A; line-height: 1.7; margin: 0;">Your personal concierge is just a message away. Reply to this email for any immediate requests.</p>
        `,
      },
    };

    const tpl = templates[type];

    return {
      subject: tpl.subject,
      html: emailHtml(tpl.body),
    };
  }

  getDueReminders(schedules: (ReminderSchedule & { dueDate: string; isDue: boolean })[]): (ReminderSchedule & { dueDate: string; isDue: boolean })[] {
    const now = new Date();
    return schedules.filter((s) => {
      if (s.sent) return false;
      const due = new Date(s.dueDate);
      return due <= now;
    });
  }
}

export const reminderEngine = new ReminderEngine();
