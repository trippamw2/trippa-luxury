// ─── Staged Reminders API ──────────────────────────────────────────────────
// The review surface for outbound booking reminders.
//
// `POST /api/ai/trigger-reminders` renders due reminders into `staged_reminders`
// and sends nothing, because the constitution forbids a nightly cron putting
// unreviewed prose in front of a guest. These two handlers complete that flow:
//
//   GET    list what is waiting, so an operator can read the exact message
//   PATCH  approve or reject one item
//   and /dispatch (separate route) sends only what was approved
//
// Access is admin-only. Approving here authorizes a real email to a real guest,
// so this is the same authority level as Mission Control and must not be
// reachable by an editor. `staged-reminders` is registered in MODULE_MIN_ROLE for
// exactly that reason.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, getIpFromRequest, sanitizeForAudit } from "@/lib/audit";
import { normalizeUuid } from "@/lib/ai/uuid";
import { recordEvent } from "@/lib/ai/event-bus";

/** Outcomes an operator may record. Both close the item. */
const REVIEW_OUTCOMES = ["approved", "rejected"] as const;
type ReviewOutcome = (typeof REVIEW_OUTCOMES)[number];

/** A staged row is awaiting review. Only this state may be transitioned. */
const OPEN_STATUSES = ["pending"] as const;

export interface StagedReminder {
  id: string;
  bookingId: string;
  bookingReference: string | null;
  kind: string;
  messageType: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  bodyHtml: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

interface StagedRow {
  id: string;
  booking_id: string;
  booking_reference: string | null;
  kind: string;
  message_type: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body_html: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

function toStaged(row: StagedRow): StagedReminder {
  return {
    id: row.id,
    bookingId: row.booking_id,
    bookingReference: row.booking_reference,
    kind: row.kind,
    messageType: row.message_type,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    subject: row.subject,
    bodyHtml: row.body_html,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
  };
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/**
 * GET /api/admin/staged-reminders
 *
 * Lists staged reminders. Defaults to the review queue (`status=pending`); pass
 * `?status=all` for the full history including dispatched and rejected rows.
 */
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireAdmin({
      module: "staged-reminders",
      minRole: "admin",
    });

    const requested = asString(request.nextUrl.searchParams.get("status")) ?? "pending";
    const scope = requested === "all" ? null : requested;

    const supabase = createAdminClient();
    const query = supabase
      .from("staged_reminders")
      .select(
        "id, booking_id, booking_reference, kind, message_type, recipient_email, " +
          "recipient_name, subject, body_html, status, created_at, reviewed_at, review_note"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (scope !== null) {
      const { error } = await query.eq("status", scope);
      if (error) {
        console.error("Staged reminders list error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error("Staged reminders list error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Select-list typing degrades to `GenericStringError` without generated DB
    // types, so the row shape is asserted here rather than silently `any`.
    const rows = (data ?? []) as unknown as StagedRow[];
    return NextResponse.json({
      reminders: rows.map(toStaged),
      pendingCount: rows.filter((r) => r.status === "pending").length,
      scope: scope ?? "all",
      reviewedBy: profile.id,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Staged reminders GET error:", error);
    return NextResponse.json({ error: "Failed to load staged reminders" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/staged-reminders
 *
 * Approve or reject one staged reminder. Body: { id, outcome, note? }.
 *
 * The status predicate lives in the UPDATE, not only in the read above. Two
 * operators who load the same pending item would both observe `pending` and both
 * write, so the second decision would silently overwrite the first and the audit
 * trail would record one decision where two humans acted. Compare-and-swap on
 * `status IN ('pending')` makes the second write a no-op, reported as a 409.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await requireAdmin({
      module: "staged-reminders",
      minRole: "admin",
    });

    const body = (await request.json()) as {
      id?: unknown;
      outcome?: unknown;
      note?: unknown;
    };

    const stagedId = typeof body.id === "string" ? normalizeUuid(body.id) : null;
    if (stagedId === null) {
      return NextResponse.json({ error: "A valid staged reminder id is required" }, { status: 400 });
    }

    const outcome =
      typeof body.outcome === "string" && (REVIEW_OUTCOMES as readonly string[]).includes(body.outcome)
        ? (body.outcome as ReviewOutcome)
        : null;
    if (outcome === null) {
      return NextResponse.json(
        { error: `outcome must be one of ${REVIEW_OUTCOMES.join(", ")}` },
        { status: 400 }
      );
    }

    const note = typeof body.note === "string" ? body.note.trim() : "";
    const now = new Date().toISOString();

    const supabase = createAdminClient();

    // Read first so the audit entry describes the real message and so a caller
    // cannot review something that was never there.
    const { data: existing, error: readError } = await supabase
      .from("staged_reminders")
      .select("id, subject, recipient_email, kind, message_type, status")
      .eq("id", stagedId)
      .single();

    if (readError || !existing) {
      return NextResponse.json({ error: readError?.message ?? "Staged reminder not found" }, { status: 404 });
    }

    const prior = existing as Record<string, unknown>;
    const priorStatus = asString(prior.status);
    if (!(OPEN_STATUSES as readonly string[]).includes(priorStatus ?? "")) {
      return NextResponse.json(
        { error: `This reminder is already ${priorStatus}` },
        { status: 409 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("staged_reminders")
      .update({
        status: outcome,
        reviewed_by: profile.id,
        reviewed_at: now,
        review_note: note || null,
      })
      .eq("id", stagedId)
      .in("status", [...OPEN_STATUSES])
      .select("id");

    if (updateError) {
      console.error("Staged reminder review error:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: "This reminder was reviewed by someone else a moment ago" },
        { status: 409 }
      );
    }

    await createAuditLog({
      tableName: "staged_reminders",
      recordId: stagedId,
      action: outcome === "approved" ? "UPDATE" : "DELETE",
      oldData: sanitizeForAudit({
        status: priorStatus,
        subject: prior.subject,
        recipient_email: prior.recipient_email,
      }),
      newData: sanitizeForAudit({
        status: outcome,
        note: note || null,
        subject: prior.subject,
        recipient_email: prior.recipient_email,
        kind: prior.kind,
        message_type: prior.message_type,
      }),
      performedBy: profile.id,
      ipAddress: getIpFromRequest(request),
    });

    // An approval is a machine-relevant fact: the event bus is what the KORA
    // layer and Mission Control read, so an approval that never emitted an event
    // would be invisible to every observer except the audit log.
    await recordEvent({
      eventType: outcome === "approved" ? "OUTBOUND_STAGED_APPROVED" : "OUTBOUND_STAGED_REJECTED",
      entityType: "staged_reminder",
      entityId: stagedId,
      actorType: "human",
      actorId: profile.id,
      payload: {
        kind: prior.kind,
        message_type: prior.message_type,
        subject: prior.subject,
        recipient_email: prior.recipient_email,
        note: note || null,
      },
    });

    return NextResponse.json({
      success: true,
      id: stagedId,
      status: outcome,
      reviewedAt: now,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Staged reminders PATCH error:", error);
    return NextResponse.json({ error: "Failed to review staged reminder" }, { status: 500 });
  }
}