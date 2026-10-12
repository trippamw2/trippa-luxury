import { NextRequest, NextResponse } from "next/server";
import { reminderEngine, generateReminderSchedules, BALANCE_REMINDER_TYPE } from "@/lib/ai/reminder-engine";
import { followUpEngine, generateFollowUpSchedules } from "@/lib/ai/follow-up-engine";
import {
  isQuietLead,
  renderNurtureEmail,
  OPEN_LEAD_STATUSES,
  NURTURE_KIND,
  NURTURE_MESSAGE_TYPE,
  type NurtureLead,
} from "@/lib/ai/nurture-engine";
import { createAdminClient } from "@/lib/supabase/admin";
import { gateAiAction, ActionBlockedError, actionBlockedResponse } from "@/lib/ai/action-gate";
import { loadSuppressions, suppressionBlocks, normalizeEmail } from "@/lib/email-consent";

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

// Journey states whose guests may still owe a balance as departure nears.
// Mirrors the retired `/api/cron/balance-reminders`, which used to email these
// guests directly and unattended.
const BALANCE_DUE_STATES = ["confirmed", "provisional"];

// How close to departure a balance reminder becomes due.
const BALANCE_WINDOW_DAYS = 30;

// Upper bound on leads considered for nurture in one run. Nurture is a nightly
// sweep of a slow-moving pool, so a cap keeps a large lead table from turning
// one cron tick into an unbounded scan; the rest wait for the next night.
const NURTURE_LEAD_LIMIT = 200;

interface SentRecord {
  type: string;
  sentAt: string;
}

interface StagedDetail {
  bookingId: string | null;
  leadId?: string;
  kind: "reminder" | "followup" | "nurture";
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

    // Balance: departure within the window and a balance still owed.
    const now = new Date();
    const balanceCutoff = new Date(
      now.getTime() + BALANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );
    const { data: balanceBookings, error: balanceError } = await supabase
      .from("bookings")
      .select("id, booking_reference, client_name, client_email, destination, start_date, balance_amount, currency, reminders_sent")
      .in("status", BALANCE_DUE_STATES)
      .not("start_date", "is", null)
      .lte("start_date", balanceCutoff.toISOString())
      .gt("balance_amount", 0);

    if (balanceError) {
      console.error("Trigger-reminders: error fetching balance-due bookings:", balanceError);
      return NextResponse.json({ error: balanceError.message }, { status: 500 });
    }

    // Consent/suppression guard. Reminders are service mail, so only a hard stop
    // (scope "all") withholds one — a plain newsletter unsubscribe must not stop
    // a reminder for a trip the guest actually booked. A lookup failure is
    // non-fatal here because staging contacts nobody; dispatch re-checks and
    // fails closed before anything is sent.
    const suppression = await loadSuppressionMapSafely([
      ...(preTripBookings ?? []).map((b) => b.client_email),
      ...(postTripBookings ?? []).map((b) => b.client_email),
      ...(balanceBookings ?? []).map((b) => b.client_email),
    ]);
    const isServiceBlocked = (email: string | null | undefined): boolean =>
      suppressionBlocks(suppression.get(normalizeEmail(email)), "service");

    const staged: StagedDetail[] = [];
    const skipped: { bookingId: string | null; leadId?: string; messageType: string; reason: string }[] = [];
    const errors: { bookingId: string | null; leadId?: string; error: string }[] = [];

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

        if (isServiceBlocked(booking.client_email)) {
          skipped.push({
            bookingId: booking.id,
            messageType: schedule.type,
            reason: "suppressed",
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

        if (isServiceBlocked(booking.client_email)) {
          skipped.push({
            bookingId: booking.id,
            messageType: schedule.type,
            reason: "suppressed",
          });
          continue;
        }

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

    // ── Balance reminders ──────────────────────────────────────────────
    // The feature the retired direct-send cron used to perform, now composed
    // for review like every other reminder.
    for (const booking of balanceBookings ?? []) {
      if (!booking.client_email || !booking.start_date || !booking.balance_amount) continue;

      const alreadySent = new Set<string>(
        (booking.reminders_sent as SentRecord[] | null)?.map((r) => r.type) ?? []
      );
      if (alreadySent.has(BALANCE_REMINDER_TYPE)) {
        skipped.push({
          bookingId: booking.id,
          messageType: BALANCE_REMINDER_TYPE,
          reason: "already sent",
        });
        continue;
      }
      if (isServiceBlocked(booking.client_email)) {
        skipped.push({
          bookingId: booking.id,
          messageType: BALANCE_REMINDER_TYPE,
          reason: "suppressed",
        });
        continue;
      }

      try {
        const clientName = booking.client_name || "Valued Guest";
        const bookingRef = booking.booking_reference || booking.id.slice(0, 8).toUpperCase();
        const content = reminderEngine.generateBalanceReminder({
          clientName,
          destination: booking.destination || "your destination",
          travelStart: booking.start_date,
          bookingRef,
          balanceAmount: Number(booking.balance_amount),
          currency: booking.currency || "USD",
        });

        const { error } = await supabase.from("staged_reminders").insert({
          booking_id: booking.id,
          booking_reference: booking.booking_reference,
          kind: "reminder",
          message_type: BALANCE_REMINDER_TYPE,
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
              messageType: BALANCE_REMINDER_TYPE,
              reason: "already staged",
            });
            continue;
          }
          throw new Error(error.message);
        }

        staged.push({
          bookingId: booking.id,
          kind: "reminder",
          messageType: BALANCE_REMINDER_TYPE,
          to: booking.client_email,
          subject: content.subject,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push({ bookingId: booking.id, error: message });
      }
    }

    // ── Lead nurture ───────────────────────────────────────────────────
    // Re-engage leads who showed interest and then went quiet. This is the arm
    // the funnel was missing: a lead who never converted had no message owed to
    // them at all. Nurture is marketing mail, so unlike a reminder it is stopped
    // by a plain unsubscribe — that distinction is carried on the row as
    // `kind = 'nurture'`, which dispatch reads to choose the suppression scope.
    const { data: candidateLeads, error: leadsError } = await supabase
      .from("leads")
      .select("id, full_name, email, preferred_destinations, preferred_start_date, occasion, lead_status, last_contacted_at, updated_at, created_at")
      .in("lead_status", OPEN_LEAD_STATUSES)
      .not("email", "is", null)
      .order("updated_at", { ascending: true })
      .limit(NURTURE_LEAD_LIMIT);

    if (leadsError) {
      // Non-fatal: the booking reminders already staged above are still valid.
      console.error("Trigger-reminders: error fetching leads for nurture:", leadsError);
    } else {
      // A lead with any non-`failed` nurture row is already handled — pending,
      // approved, dispatching, dispatched or rejected. `failed` is excluded so a
      // transient provider outage leaves the lead re-stageable, exactly like a
      // booking reminder. This is done in one read rather than per-lead.
      const { data: existingNurture, error: existingNurtureError } = await supabase
        .from("staged_reminders")
        .select("lead_id")
        .eq("message_type", NURTURE_MESSAGE_TYPE)
        .not("lead_id", "is", null)
        .neq("status", "failed");

      if (existingNurtureError) {
        console.error(
          "Trigger-reminders: error reading existing nurture rows:",
          existingNurtureError
        );
      }

      const alreadyNurtured = new Set<string>();
      for (const row of existingNurture ?? []) {
        const leadId = (row as { lead_id: string | null }).lead_id;
        if (leadId) alreadyNurtured.add(leadId);
      }

      // Consent for nurture is the `marketing` scope, not `service`.
      const quietLeads = (candidateLeads ?? []).filter((lead) =>
        isQuietLead(lead as NurtureLead, now)
      );
      const nurtureSuppression = await loadSuppressionMapSafely(
        quietLeads.map((lead) => lead.email)
      );
      const isMarketingBlocked = (email: string | null | undefined): boolean =>
        suppressionBlocks(nurtureSuppression.get(normalizeEmail(email)), "marketing");

      for (const lead of quietLeads) {
        if (!lead.email) continue;

        if (alreadyNurtured.has(lead.id)) {
          skipped.push({
            bookingId: null,
            leadId: lead.id,
            messageType: NURTURE_MESSAGE_TYPE,
            reason: "already staged",
          });
          continue;
        }

        if (isMarketingBlocked(lead.email)) {
          skipped.push({
            bookingId: null,
            leadId: lead.id,
            messageType: NURTURE_MESSAGE_TYPE,
            reason: "suppressed",
          });
          continue;
        }

        try {
          const content = renderNurtureEmail(lead as NurtureLead);

          const { error } = await supabase.from("staged_reminders").insert({
            booking_id: null,
            lead_id: lead.id,
            kind: NURTURE_KIND,
            message_type: NURTURE_MESSAGE_TYPE,
            recipient_email: lead.email,
            recipient_name: lead.full_name ?? null,
            subject: content.subject,
            body_html: content.html,
            status: "pending",
          });

          if (error) {
            if (error.code === "23505") {
              skipped.push({
                bookingId: null,
                leadId: lead.id,
                messageType: NURTURE_MESSAGE_TYPE,
                reason: "already staged",
              });
              continue;
            }
            throw new Error(error.message);
          }

          staged.push({
            bookingId: null,
            leadId: lead.id,
            kind: NURTURE_KIND,
            messageType: NURTURE_MESSAGE_TYPE,
            to: lead.email,
            subject: content.subject,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          errors.push({ bookingId: null, leadId: lead.id, error: message });
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

/**
 * Load suppressions for staging without letting a lookup failure stop the run.
 * Staging contacts nobody, and dispatch re-checks suppression before any send,
 * so a transient failure here degrades to "possibly staged, never wrongly sent"
 * rather than "no reminders at all".
 */
async function loadSuppressionMapSafely(
  emails: (string | null | undefined)[]
): Promise<Map<string, "marketing" | "all">> {
  try {
    return await loadSuppressions(emails.filter((e): e is string => !!e));
  } catch (err) {
    console.error("Trigger-reminders: suppression lookup failed, staging without it:", err);
    return new Map();
  }
}