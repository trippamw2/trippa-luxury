import { NextRequest, NextResponse } from "next/server";
import { reminderEngine, generateReminderSchedules } from "@/lib/ai/reminder-engine";
import { followUpEngine, generateFollowUpSchedules } from "@/lib/ai/follow-up-engine";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/ai/trigger-reminders
 *
 * Cron-job-friendly endpoint that scans all active bookings and emails any
 * pre-trip reminder (n30 / n14 / n7 / n1 / day-of) or post-trip follow-up
 * (d1 / d7 / d30) whose due date has arrived and has not already been sent.
 *
 * Idempotency is guaranteed by the `reminders_sent` / `followups_sent` JSONB
 * columns on `bookings` (migration 024) — a given reminder type is emailed at
 * most once per booking, so repeated cron runs never double-send.
 *
 * Auth: Bearer token matching CRON_SECRET env var.
 *
 * Response:
 *   { sent: number, errors: number, details: { sent: [...], errors: [...] } }
 */

// Journey states eligible for pre-trip reminders (mirrors orchestrator.checkReminders)
const PRE_TRIP_STATES = ["confirmed", "itinerary-sent"];

// Journey state eligible for post-trip follow-ups
const POST_TRIP_STATES = ["completed"];

interface SentRecord {
  type: string;
  sentAt: string;
}

interface DueItem {
  type: string;
  to: string;
  subject: string;
}

export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedToken = process.env.CRON_SECRET;

    if (!expectedToken) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    }

    if (authToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Pre-trip: confirmed / itinerary-sent journeys with a known start date
    const { data: preTripBookings, error: preTripError } = await supabase
      .from("bookings")
      .select("id, booking_reference, client_name, client_email, destination, start_date, reminders_sent")
      .in("status", PRE_TRIP_STATES)
      .not("start_date", "is", null);

    if (preTripError) {
      console.error("Trigger-reminders: error fetching pre-trip bookings:", preTripError);
      return NextResponse.json({ error: preTripError.message }, { status: 500 });
    }

    // Post-trip: completed journeys with a known end date
    const { data: postTripBookings, error: postTripError } = await supabase
      .from("bookings")
      .select("id, booking_reference, client_name, client_email, destination, end_date, followups_sent")
      .in("status", POST_TRIP_STATES)
      .not("end_date", "is", null);

    if (postTripError) {
      console.error("Trigger-reminders: error fetching post-trip bookings:", postTripError);
      return NextResponse.json({ error: postTripError.message }, { status: 500 });
    }

    const sent: DueItem[] = [];
    const errors: { bookingId: string; error: string }[] = [];

    // ── Pre-trip reminders ─────────────────────────────────────────────
    for (const booking of preTripBookings ?? []) {
      if (!booking.client_email || !booking.start_date) continue;

      const alreadySent = new Set<string>(
        (booking.reminders_sent as SentRecord[] | null)?.map((r) => r.type) ?? []
      );
      const schedules = reminderEngine.getDueReminders(
        generateReminderSchedules(booking.start_date)
      );
      const newlySent: SentRecord[] = [];
      const clientName = booking.client_name || "Valued Guest";
      const destination = booking.destination || "your destination";
      const bookingRef = booking.booking_reference || booking.id.slice(0, 8).toUpperCase();

      for (const schedule of schedules) {
        if (alreadySent.has(schedule.type)) continue;

        try {
          const content = reminderEngine.generateReminder(
            schedule.type,
            clientName,
            destination,
            booking.start_date,
            bookingRef
          );

          await sendEmail({
            to: [{ email: booking.client_email, name: clientName }],
            subject: content.subject,
            htmlContent: content.html,
          });

          newlySent.push({ type: schedule.type, sentAt: new Date().toISOString() });
          sent.push({ type: `reminder-${schedule.type}`, to: booking.client_email, subject: content.subject });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          errors.push({ bookingId: booking.id, error: message });
        }
      }

      if (newlySent.length > 0) {
        await supabase
          .from("bookings")
          .update({
            reminders_sent: [...((booking.reminders_sent as SentRecord[] | null) ?? []), ...newlySent],
          })
          .eq("id", booking.id);
      }
    }

    // ── Post-trip follow-ups ───────────────────────────────────────────
    const now = new Date();

    for (const booking of postTripBookings ?? []) {
      if (!booking.client_email || !booking.end_date) continue;

      const alreadySent = new Set<string>(
        (booking.followups_sent as SentRecord[] | null)?.map((f) => f.type) ?? []
      );
      const schedules = generateFollowUpSchedules(booking.end_date);
      const newlySent: SentRecord[] = [];
      const clientName = booking.client_name || "Valued Guest";
      const destination = booking.destination || "your journey";

      for (const schedule of schedules) {
        if (alreadySent.has(schedule.type)) continue;
        if (new Date(schedule.dueDate) > now) continue;

        try {
          const content = followUpEngine.generateFollowUp(schedule.type, clientName, destination);

          await sendEmail({
            to: [{ email: booking.client_email, name: clientName }],
            subject: content.subject,
            htmlContent: content.html,
          });

          newlySent.push({ type: schedule.type, sentAt: new Date().toISOString() });
          sent.push({ type: `followup-${schedule.type}`, to: booking.client_email, subject: content.subject });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          errors.push({ bookingId: booking.id, error: message });
        }
      }

      if (newlySent.length > 0) {
        await supabase
          .from("bookings")
          .update({
            followups_sent: [...((booking.followups_sent as SentRecord[] | null) ?? []), ...newlySent],
          })
          .eq("id", booking.id);
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