import { NextRequest, NextResponse } from "next/server";
import { reminderEngine, generateReminderSchedules } from "@/lib/ai/reminder-engine";
import { followUpEngine, generateFollowUpSchedules } from "@/lib/ai/follow-up-engine";
import { sendEmail } from "@/lib/email";

// This endpoint is designed to be called by a cron job (e.g., Vercel Cron)
// Checks all active journeys and sends any due reminders or follow-ups

interface JourneyRecord {
  id: string;
  clientName: string;
  email: string;
  state: string;
  destination?: string;
  travelStart?: string;
  travelEnd?: string;
  bookingRef?: string;
  remindersSent: { type: string; sentAt: string }[];
  followUpsSent: { type: string; sentAt: string; response?: string }[];
}

export async function POST(request: NextRequest) {
  try {
    // In production, fetch from database
    // For now, this is a pass-through that validates the cron request
    const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const journeys: JourneyRecord[] = body.journeys || [];

    const sent: { type: string; to: string; subject: string }[] = [];
    const errors: { journeyId: string; error: string }[] = [];

    for (const journey of journeys) {
      try {
        // Pre-trip reminders
        if (journey.travelStart && (journey.state === "confirmed" || journey.state === "itinerary-sent")) {
          const schedules = generateReminderSchedules(journey.travelStart);
          const due = reminderEngine.getDueReminders(schedules);

          for (const reminder of due) {
            const content = reminderEngine.generateReminder(
              reminder.type,
              journey.clientName,
              journey.destination || "your destination",
              journey.travelStart,
              journey.bookingRef || journey.id
            );

            const result = await sendEmail({
              to: [{ email: journey.email, name: journey.clientName }],
              subject: content.subject,
              htmlContent: content.html,
            });

            sent.push({ type: `reminder-${reminder.type}`, to: journey.email, subject: content.subject });
          }
        }

        // Post-trip follow-ups
        if (journey.travelEnd && journey.state === "completed") {
          const schedules = generateFollowUpSchedules(journey.travelEnd);
          const now = new Date();

          for (const schedule of schedules) {
            if (schedule.sent) continue;
            const dueDate = new Date(schedule.dueDate);
            if (dueDate > now) continue;

            const content = followUpEngine.generateFollowUp(
              schedule.type,
              journey.clientName,
              journey.destination || "your journey"
            );

            const result = await sendEmail({
              to: [{ email: journey.email, name: journey.clientName }],
              subject: content.subject,
              htmlContent: content.html,
            });

            sent.push({ type: `followup-${schedule.type}`, to: journey.email, subject: content.subject });
          }
        }
      } catch (err: any) {
        errors.push({ journeyId: journey.id, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      sent: sent.length,
      errors: errors.length,
      details: { sent, errors },
    });
  } catch (error) {
    console.error("Trigger reminders error:", error);
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
  }
}
