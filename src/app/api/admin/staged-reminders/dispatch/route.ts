// ─── Staged Reminder Dispatch ──────────────────────────────────────────────
// The only route in the platform permitted to put an automated booking reminder
// in front of a guest.
//
// The split this completes:
//
//   POST /api/ai/trigger-reminders            unattended → stages, sends nothing
//   POST /api/admin/staged-reminders/dispatch  admin     → sends what was approved
//
// The gate is asked to authorize `dispatch-staged-reminders`, which declares
// `humanAuthorized: true` and `staged: true`. Both are earned rather than
// asserted: the rows sent here carry a `reviewed_by` set by a named admin, and
// the body sent is the exact `body_html` that admin read. This route cannot
// compose or alter a message.
//
// If the gate refuses — an operator has switched off AI outbound, or the dial
// has been moved — nothing is sent, because the gate runs BEFORE any row is
// read.
//
// Ordering inside the send loop is deliberate and is the only thing standing
// between a retry and a duplicate guest email:
//
//   1. claim   approved → dispatching   (compare-and-swap, before the provider)
//   2. send    the exact reviewed body
//   3. confirm dispatching → dispatched (+ booking's sent ledger)
//   4. on error, dispatching → failed   (retryable; never `approved` again)
//
// Claiming first is what makes two admins clicking "send" simultaneously safe.
// Marking a row dispatched only *after* the send cannot prevent the duplicate —
// both requests would already have handed the message to Brevo.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, getIpFromRequest, sanitizeForAudit } from "@/lib/audit";
import { gateAiAction, ActionBlockedError, actionBlockedResponse } from "@/lib/ai/action-gate";
import { recordEvent } from "@/lib/ai/event-bus";
import { sendEmail } from "@/lib/email";

/** The only status eligible to enter a send. */
const APPROVED = "approved";
/** The transient claim held while a send is in flight. */
const CLAIMED = "dispatching";
/** Terminal-for-now states a claim may be reclaimed from once it goes stale. */
const STALE_CLAIM_MINUTES = 15;
/** Upper bound per request; anything beyond waits for the next dispatch. */
const BATCH_LIMIT = 500;

interface DispatchableRow {
  id: string;
  booking_id: string;
  booking_reference: string | null;
  kind: string;
  message_type: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body_html: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

interface SentRecord {
  type: string;
  sentAt: string;
}

/**
 * POST /api/admin/staged-reminders/dispatch
 *
 * Sends every approved staged reminder. Optional body `{ "id": "<uuid>" }` sends
 * a single row instead of the whole queue.
 *
 * Per-row outcomes are reported individually: one provider failure marks that row
 * `failed` and the rest still go out. A batch that aborted on the first error
 * would leave the queue ambiguous — some guests contacted, some not, and no record
 * of which.
 */
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireAdmin({
      module: "staged-reminders",
      minRole: "admin",
    });

    // Gate before reading anything, so a refusal costs nothing and no row is
    // touched. `record: false` because the approval is already the ledger entry
    // for this decision; dispatch is its execution, not a second decision.
    try {
      await gateAiAction("dispatch-staged-reminders", undefined, { record: false });
    } catch (gateError) {
      if (gateError instanceof ActionBlockedError) return actionBlockedResponse(gateError);
      throw gateError;
    }

    let singleId: string | null = null;
    try {
      const text = await request.text();
      if (text.trim() !== "") {
        const parsed = JSON.parse(text) as { id?: unknown };
        if (typeof parsed.id === "string" && parsed.id.trim() !== "") {
          singleId = parsed.id.trim();
        }
      }
    } catch {
      // A body that is not JSON means "send the whole queue" rather than an
      // error: dispatch is also curl/cron friendly, and demanding a body would
      // make an accidental empty POST fail for no benefit.
    }

    const supabase = createAdminClient();

    // ── Recover claims abandoned by a crashed process ────────────────────
    // A row stuck in `dispatching` means a previous process died between the
    // claim and the confirmation. Whether the guest was contacted is unknowable
    // from here, so the row is handed back as `failed`: visible to an operator,
    // and re-stageable by the next cron run. It is deliberately NOT reset to
    // `approved`, because auto-resending an unknown-outcome message is exactly
    // the duplicate this claim exists to prevent.
    const staleBefore = new Date(Date.now() - STALE_CLAIM_MINUTES * 60_000).toISOString();
    const { data: reclaimed, error: reclaimError } = await supabase
      .from("staged_reminders")
      .update({
        status: "failed",
        dispatching_at: null,
        dispatch_error: "Dispatch interrupted before delivery was confirmed; re-stage and review to retry.",
      })
      .eq("status", CLAIMED)
      .lt("dispatching_at", staleBefore)
      .select("id");

    if (reclaimError) {
      // Deliberately not fatal. The rows this batch was called to send are still
      // approved and still claimable, so failing here over a housekeeping problem
      // would strand them for no reason. Logged loudly because it does mean an
      // abandoned claim stays invisible until the next attempt sweeps it.
      console.error("Staged reminder stale-claim reclaim failed:", reclaimError.message);
    } else if (reclaimed && reclaimed.length > 0) {
      console.error(
        `Staged reminder dispatch reclaimed ${reclaimed.length} abandoned claim(s).`
      );
    }

    let query = supabase
      .from("staged_reminders")
      .select(
        "id, booking_id, booking_reference, kind, message_type, recipient_email, " +
          "recipient_name, subject, body_html, reviewed_by, reviewed_at"
      )
      .eq("status", APPROVED)
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (singleId !== null) {
      query = query.eq("id", singleId);
    }

    const { data, error: listError } = await query;
    if (listError) {
      console.error("Staged reminder dispatch list error:", listError.message);
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    // Select-list typing degrades to `GenericStringError` without generated DB
    // types, so the row shape is asserted here rather than silently `any`.
    const rows = (data ?? []) as unknown as DispatchableRow[];

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        dispatched: 0,
        failed: 0,
        message:
          singleId === null
            ? "No approved reminders are waiting to send."
            : "That reminder is not approved for sending.",
      });
    }

    const dispatched: { id: string; to: string; subject: string }[] = [];
    const failures: { id: string; error: string }[] = [];

    for (const row of rows) {
      // An approved row with nobody's name on it cannot justify the
      // `humanAuthorized` claim this dispatch rests on, so it is not sent.
      if (!row.reviewed_by) {
        failures.push({ id: row.id, error: "No reviewer recorded on this approval" });
        await supabase
          .from("staged_reminders")
          .update({ status: "failed", dispatch_error: "No reviewer recorded" })
          .eq("id", row.id)
          .eq("status", APPROVED);
        continue;
      }

      // ── 1. Claim ────────────────────────────────────────────────────────
      const { data: claim, error: claimError } = await supabase
        .from("staged_reminders")
        .update({ status: CLAIMED, dispatching_at: new Date().toISOString() })
        .eq("id", row.id)
        .eq("status", APPROVED)
        .select("id");

      if (claimError) {
        failures.push({ id: row.id, error: claimError.message });
        continue;
      }
      // Lost the race: a concurrent dispatch claimed or already sent this row.
      if (!claim || claim.length === 0) continue;

      // ── 2. Send ────────────────────────────────────────────────────────
      try {
        const result = await sendEmail({
          to: [
            {
              email: row.recipient_email,
              name: row.recipient_name || undefined,
            },
          ],
          subject: row.subject,
          htmlContent: row.body_html,
        });

        // `sendEmail` throws on provider failure rather than resolving false,
        // so this only guards a future non-throwing provider.
        if (!result.success) {
          throw new Error("Email provider rejected the message");
        }

        const now = new Date().toISOString();

        // ── 3. Confirm ────────────────────────────────────────────────────
        const { error: confirmError } = await supabase
          .from("staged_reminders")
          .update({
            status: "dispatched",
            dispatched_at: now,
            dispatching_at: null,
            message_id: result.messageId ?? null,
            dispatch_error: null,
          })
          .eq("id", row.id)
          .eq("status", CLAIMED);

        if (confirmError) {
          // The guest HAS been contacted but the row still reads `dispatching`.
          // Stale-claim recovery will hand it back as `failed`, which is the safe
          // direction: the next sweep must not re-send a message whose delivery is
          // unknown. It will not retry this row — an operator has to re-stage and
          // re-approve it, and the ledger note above is what tells them why.
          failures.push({
            id: row.id,
            error: `Delivered but could not be recorded: ${confirmError.message}`,
          });
          console.error(`Staged reminder ${row.id} was delivered but not confirmed.`);
          continue;
        }

        // Only now is the guest actually contacted, so only now is the booking's
        // sent ledger updated. Recording delivery earlier would permanently
        // suppress a message that never arrived.
        await appendSentRecord(supabase, row.booking_id, row.kind, {
          type: row.message_type,
          sentAt: now,
        });

        dispatched.push({ id: row.id, to: row.recipient_email, subject: row.subject });

        await recordEvent({
          eventType: "CLIENT_ACCEPTED",
          entityType: "booking",
          entityId: row.booking_id,
          actorType: "system",
          payload: {
            externalId: row.booking_reference,
            staged_reminder_id: row.id,
            kind: row.kind,
            message_type: row.message_type,
            recipient_email: row.recipient_email,
            approved_by: row.reviewed_by,
          },
        });
      } catch (err: unknown) {
        // ── 4. Fail, never re-arm ─────────────────────────────────────────
        const message = err instanceof Error ? err.message : "Unknown error";
        failures.push({ id: row.id, error: message });

        // `failed` is the one status a later staging run may overwrite, so a
        // transient provider outage is retryable rather than a lost reminder.
        await supabase
          .from("staged_reminders")
          .update({ status: "failed", dispatching_at: null, dispatch_error: message })
          .eq("id", row.id)
          .eq("status", CLAIMED);

        console.error(`Staged reminder dispatch failed for ${row.id}:`, message);
      }
    }

    if (dispatched.length > 0 || failures.length > 0) {
      await createAuditLog({
        tableName: "staged_reminders",
        action: "CAMPAIGN_SEND",
        oldData: sanitizeForAudit({
          approved_count: rows.length,
          approved_ids: rows.map((r) => r.id),
        }),
        newData: sanitizeForAudit({
          dispatched_count: dispatched.length,
          failed_count: failures.length,
          dispatched: dispatched.map((d) => ({ to: d.to, subject: d.subject })),
          failures,
        }),
        performedBy: profile.id,
        ipAddress: getIpFromRequest(request),
      });
    }

    return NextResponse.json({
      success: failures.length === 0,
      dispatched: dispatched.length,
      failed: failures.length,
      details: { dispatched, failures },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Staged reminder dispatch error:", error);
    return NextResponse.json({ error: "Failed to dispatch reminders" }, { status: 500 });
  }
}

/**
 * Appends one entry to a booking's `reminders_sent` / `followups_sent` JSONB
 * ledger.
 *
 * That column is the idempotency key the staging cron reads to decide what a
 * guest has already received, so silently losing an append would re-stage a
 * reminder the guest already got. The write is therefore verified and retried:
 * two concurrent dispatches touching different messages of the same booking can
 * interleave a read-modify-write, and re-reading is what catches it.
 */
async function appendSentRecord(
  supabase: ReturnType<typeof createAdminClient>,
  bookingId: string,
  kind: string,
  record: SentRecord
): Promise<void> {
  const column = kind === "reminder" ? "reminders_sent" : "followups_sent";

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("bookings")
      .select(column)
      .eq("id", bookingId)
      .single();

    if (error) {
      console.error(`Could not read ${column} for booking ${bookingId}:`, error.message);
      return;
    }

    // `select(column)` narrows the row to a single-key object, so the column is
    // read through a record view rather than a keyof-narrowed type.
    const existing = sentRecordsOn(data, column);
    if (existing.some((r) => r.type === record.type)) return;

    const next = [...existing, record];

    const { error: writeError } = await supabase
      .from("bookings")
      .update({ [column]: next })
      .eq("id", bookingId);

    if (writeError) {
      console.error(`Could not write ${column} for booking ${bookingId}:`, writeError.message);
      return;
    }

    // Confirm the entry survived rather than being clobbered by a concurrent
    // write between our read and our update.
    const { data: verify } = await supabase
      .from("bookings")
      .select(column)
      .eq("id", bookingId)
      .single();

    const confirmed = sentRecordsOn(verify, column);
    if (confirmed.some((r) => r.type === record.type)) return;
  }

  console.error(
    `Gave up appending ${record.type} to ${column} for booking ${bookingId} after 3 attempts.`
  );
}

/**
 * Reads one of the sent-ledger JSONB columns off a booking row.
 *
 * The row comes back narrowed to whichever single column was selected, so it is
 * viewed as a record before the lookup. A malformed or absent column reads as an
 * empty ledger rather than throwing, because an unreadable ledger must not stop
 * the rest of a dispatch.
 */
function sentRecordsOn(row: unknown, column: string): SentRecord[] {
  if (row === null || typeof row !== "object") return [];
  const value = (row as Record<string, unknown>)[column];
  return Array.isArray(value) ? (value as SentRecord[]) : [];
}