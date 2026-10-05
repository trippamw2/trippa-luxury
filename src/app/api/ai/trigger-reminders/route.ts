import { NextRequest, NextResponse } from "next/server";
import { reminderEngine, generateReminderSchedules } from "@/lib/ai/reminder-engine";
import { followUpEngine, generateFollowUpSchedules } from "@/lib/ai/follow-up-engine";
import { createAdminClient } from "@/lib/supabase/admin";
import { gateAiAction, ActionBlockedError, actionBlockedResponse } from "@/lib/ai/action-gate";

/**
 * POST /api/ai/trigger-reminders  (STAGE ONLY — sends nothing)
 *
 * Scans all active bookings for a pre-trip reminder (n30 / n14 / n7 / n1 /
 * day-of) or post-trip follow-up (d1 / d7 / d30) that has come due, renders the
 * exact email, and writes it to `staged_reminders` for a human to read.
 *
 * This route sends no email. That is the whole point: it runs unattended from a
 * cron, so under the constitution it may not put unreviewed prose in front of a
 * guest. Composing into a reviewable row is an internal write and contacts
 * nobody; `POST /api/admin/staged-reminders/dispatch` performs the send, and
 * only for rows a named admin approved.
 *
 * Consequently this route must NOT touch `reminders_sent` / `followups_sent`.
 * Those columns record what a guest actually received, and they are the
 * idempotency key for dispatch. Marking a message "sent" at staging time would
 * let a rejected draft silently suppress the real reminder forever — the guest
 * would never be contacted and nothing would ever show as outstanding.
 *
 * Idempotency here is enforced by the `staged_reminders_open_key` partial unique
 * index: one open row per (booking, kind, message type). Repeated nightly runs
 * are therefore a no-op, and a `failed` row is the one state that may be
 * re-staged.
 *
 * Auth: Bearer token matching CRON_SECRET env var.
 *
 * Response:
 *   { staged: number, skipped: number, errors: number, details: {...} }
 */

// Journey states eligible for pre-trip reminders (mirrors orchestrator.checkReminders)
const PRE_TRIP_STATES = ["confirmed", "itinerary-sent"];

// Journey state eligible for post-trip follow-ups
const POST_TRIP_STATES = ["completed"];

interface SentRecord {
  type: string;
  sentAt: string;
}

interface StagedDetail {
  bookingId: string;
  kind: "reminder" | "followup";
  messageType: string;
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

    // Composition is an internal write: reversible, and it reaches no guest. The
    // dial's own gates still apply, so an operator who has switched off AI
    // internal writes stops reminder staging too, and the refusal is recorded in
    // the decisions ledger exactly like any other blocked action.
    try {
      await gateAiAction("trigger-reminders", undefined, { record: true });
    } catch (gateError) {
      if (gateError instanceof ActionBlockedError) return actionBlockedResponse(gateError);
      throw gateError;
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

    const staged: StagedDetail[] = [];
    const skipped: { bookingId: string; messageType: string; reason: string }[] = [];
    const errors: { bookingId: string; error: string }[] = [];

    // ── Pre-trip reminders ─────────────────────────────────────────────
    for (const booking of preTripBookings ?? []) {
      if (!booking.client_email || !booking.start_date) continue;

      // Only messages a guest has genuinely received are suppressed. A staged
      // row is not a suppression: it is a draft awaiting review.
      const alreadySent = new Set<string>(
        (booking.reminders_sent as SentRecord[] | null)?.map((r) => r.type) ?? []
      );
      const schedules = reminderEngine.getDueReminders(
        generateReminderSchedules(booking.start_date)
      );
      const clientName = booking.client_name || "Valued Guest";
      const destination = booking.destination || "your destination";
      const bookingRef = booking.booking_reference || booking.id.slice(0, 8).toUpperCase();

      for (const schedule of schedules) {
        if (alreadySent.has(schedule.type)) {
          skipped.push({
            bookingId: booking.id,
            messageType: schedule.type,
            reason: "already sent",
          });
          continue;
        }

        try {
          const content = reminderEngine.generateReminder(
            schedule.type,
            clientName,
            destination,
            booking.start_date,
            bookingRef
          );

          const { error } = await supabase.from("staged_reminders").insert({
            booking_id: booking.id,
            booking_reference: booking.booking_reference,
            kind: "reminder",
            message_type: schedule.type,
            recipient_email: booking.client_email,
            recipient_name: clientName,
            subject: content.subject,
            body_html: content.html,
            status: "pending",
          });

          if (error) {
            // 23505 = unique_violation: the open-row index already holds this
            // message, meaning a previous run staged it. Not a failure.
            if (error.code === "23505") {
              skipped.push({
                bookingId: booking.id,
                messageType: schedule.type,
                reason: "already staged",
              });
              continue;
            }
            throw new Error(error.message);
          }

          staged.push({
            bookingId: booking.id,
            kind: "reminder",
            messageType: schedule.type,
            to: booking.client_email,
            subject: content.subject,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          errors.push({ bookingId: booking.id, error: message });
        }
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
      const clientName = booking.client_name || "Valued Guest";
      const destination = booking.destination || "your journey";

      for (const schedule of schedules) {
        if (alreadySent.has(schedule.type)) {
          skipped.push({
            bookingId: booking.id,
            messageType: schedule.type,
            reason: "already sent",
          });
          continue;
        }
        if (new Date(schedule.dueDate) > now) continue;

        try {
          const content = followUpEngine.generateFollowUp(schedule.type, clientName, destination);

          const { error } = await supabase.from("staged_reminders").insert({
            booking_id: booking.id,
            booking_reference: booking.booking_reference,
            kind: "followup",
            message_type: schedule.type,
            recipient_email: booking.client_email,
            recipient_name: clientName,
            subject: content.subject,
            body_html: content.html,
            status: "pending",
          });

          if (error) {
            if (error.code === "23505") {
              skipped.push({
                bookingId: booking.id,
                messageType: schedule.type,
                reason: "already staged",
              });
              continue;
            }
            throw new Error(error.message);
          }

          staged.push({
            bookingId: booking.id,
            kind: "followup",
            messageType: schedule.type,
            to: booking.client_email,
            subject: content.subject,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          errors.push({ bookingId: booking.id, error: message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      // `staged`, never `sent`. A cron reading `sent: 0` would be a bug report;
      // reading `staged: 12` is the honest signal that a human has work waiting.
      staged: staged.length,
      skipped: skipped.length,
      errors: errors.length,
      awaitingReview: `/admin/staged-reminders`,
      details: { staged, skipped, errors },
    });
  } catch (error) {
    console.error("Trigger reminders error:", error);
    return NextResponse.json({ error: "Failed to stage reminders" }, { status: 500 });
  }
}