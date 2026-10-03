// ─── Mission Control API ────────────────────────────────────────────────────
// The single human-authorization surface. Three separate tables each record
// "a machine wants a human to look at this":
//
//   decisions              rows the autonomy policy escalated for a human
//   system_gaps            KORA findings whose remediation needs approval
//   system_events          HUMAN_REVIEW_REQUESTED escalations
//
// An operator has to clear all three. Rather than open three screens and
// reconcile them, this route normalises them into one queue ordered by when the
// company is most exposed.
//
// Access is admin-only. Reviewing an item here can release a financial or
// supplier commitment, which is level 4 in every case, so an editor must not be
// able to reach it. `mission-control` is listed in MODULE_MIN_ROLE for exactly
// this reason — an unlisted module silently falls back to "editor".
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, getIpFromRequest, sanitizeForAudit } from "@/lib/audit";
import { recordEvent } from "@/lib/ai/event-bus";
import { normalizeUuid } from "@/lib/ai/uuid";

/** How a human may close out an escalated decision. */
const HUMAN_OUTCOMES = ["approved", "rejected", "overridden"] as const;
type HumanOutcome = (typeof HUMAN_OUTCOMES)[number];

/** A decision still awaiting a human. Closed states are excluded. */
const OPEN_DECISION_STATUSES = ["proposed", "rejected"] as const;

/** A gap still awaiting a human. Resolved/abandoned ones are excluded. */
const CLOSED_GAP_STATUSES = ["resolved", "dismissed", "rejected", "approved"] as const;

interface ReviewItem {
  /** Namespaced so a client can tell the three sources apart. */
  id: string;
  source: "decision" | "gap" | "event";
  title: string;
  summary: string | null;
  recommendation: string | null;
  status: string;
  riskLevel: string | null;
  agentName: string | null;
  autonomyLevel: number | null;
  evidenceCount: number | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

const RISK_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Most exposed first: highest risk, then newest. */
function byExposure(a: ReviewItem, b: ReviewItem): number {
  const ra = RISK_ORDER[a.riskLevel ?? "low"] ?? 3;
  const rb = RISK_ORDER[b.riskLevel ?? "low"] ?? 3;
  if (ra !== rb) return ra - rb;
  return b.createdAt.localeCompare(a.createdAt);
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function asNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function handleAuthError(err: unknown): NextResponse | null {
  if (err instanceof AdminAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return null;
}

export async function GET() {
  try {
    await requireAdmin({ module: "mission-control", minRole: "admin" });
    const supabase = createAdminClient();

    // Run the three reads concurrently; a partial queue is worse than none,
    // so any read error fails the whole request rather than silently dropping
    // one table's worth of pending authorizations.
    const [decisionsRes, gapsRes, eventsRes] = await Promise.all([
      supabase
        .from("decisions")
        .select(
          "id, decision_type, title, rationale, recommendation, agent_name, entity_type, entity_id, autonomy_level, evidence_count, risk_level, status, human_review_required, created_at"
        )
        .eq("human_review_required", true)
        .in("status", [...OPEN_DECISION_STATUSES])
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("system_gaps")
        .select(
          "id, category, title, description, recommendation, severity, status, evidence_count, detected_by, last_seen_at, created_at"
        )
        .eq("requires_human_approval", true)
        .not("status", "in", `(${CLOSED_GAP_STATUSES.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("system_events")
        .select(
          "id, event_type, entity_type, entity_id, actor_type, autonomy_level, payload, created_at"
        )
        .eq("event_type", "HUMAN_REVIEW_REQUESTED")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const readError = decisionsRes.error || gapsRes.error || eventsRes.error;
    if (readError) {
      console.error("Mission Control queue read error:", readError.message);
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const items: ReviewItem[] = [];

    for (const row of decisionsRes.data ?? []) {
      const r = row as Record<string, unknown>;
      items.push({
        id: String(r.id),
        source: "decision",
        title: asString(r.title) ?? "Untitled decision",
        summary: asString(r.rationale),
        recommendation: asString(r.recommendation),
        status: asString(r.status) ?? "proposed",
        riskLevel: asString(r.risk_level),
        agentName: asString(r.agent_name),
        autonomyLevel: asNumber(r.autonomy_level),
        evidenceCount: asNumber(r.evidence_count),
        entityType: asString(r.entity_type),
        entityId: asString(r.entity_id),
        createdAt: asString(r.created_at) ?? new Date().toISOString(),
      });
    }

    for (const row of gapsRes.data ?? []) {
      const r = row as Record<string, unknown>;
      items.push({
        id: String(r.id),
        source: "gap",
        title: asString(r.title) ?? "Untitled gap",
        summary: asString(r.description),
        recommendation: asString(r.recommendation),
        status: asString(r.status) ?? "open",
        // Gap severity and decision risk_level share a vocabulary; critical
        // gaps are the ones the operator must see first.
        riskLevel: asString(r.severity),
        agentName: asString(r.detected_by),
        autonomyLevel: null,
        evidenceCount: asNumber(r.evidence_count),
        entityType: "system_gap",
        entityId: asString(r.id),
        createdAt: asString(r.created_at) ?? asString(r.last_seen_at) ?? new Date().toISOString(),
      });
    }

    for (const row of eventsRes.data ?? []) {
      const r = row as Record<string, unknown>;
      const payload =
        typeof r.payload === "object" && r.payload !== null && !Array.isArray(r.payload)
          ? (r.payload as Record<string, unknown>)
          : {};
      const entityType = asString(r.entity_type);
      items.push({
        id: String(r.id),
        source: "event",
        title: asString(payload.title) ?? `Human review requested on ${entityType ?? "record"}`,
        summary: asString(payload.reason) ?? asString(payload.summary),
        recommendation: null,
        status: "escalated",
        riskLevel: asString(payload.riskLevel),
        agentName: asString(r.actor_type),
        autonomyLevel: asNumber(r.autonomy_level),
        evidenceCount: null,
        entityType,
        entityId: asString(r.entity_id),
        createdAt: asString(r.created_at) ?? new Date().toISOString(),
      });
    }

    items.sort(byExposure);

    return NextResponse.json({
      items,
      counts: {
        total: items.length,
        decision: items.filter((i) => i.source === "decision").length,
        gap: items.filter((i) => i.source === "gap").length,
        event: items.filter((i) => i.source === "event").length,
      },
    });
  } catch (err: unknown) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
    console.error("Error in GET /api/admin/mission-control:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Record a human authorization against an escalated decision.
 *
 * `overridden` exists so that agreeing with a machine rejection is not
 * recorded as plain approval: the row keeps its `rejected` provenance and the
 * override is visible. Collapsing the two would make the ledger lie about what
 * the gate concluded.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await requireAdmin({ module: "mission-control", minRole: "admin" });

    const body = (await request.json()) as {
      id?: unknown;
      outcome?: unknown;
      note?: unknown;
    };

    const decisionId = typeof body.id === "string" ? normalizeUuid(body.id) : null;
    if (decisionId === null) {
      return NextResponse.json({ error: "A valid decision id is required" }, { status: 400 });
    }

    const outcome =
      typeof body.outcome === "string" && (HUMAN_OUTCOMES as readonly string[]).includes(body.outcome)
        ? (body.outcome as HumanOutcome)
        : null;
    if (outcome === null) {
      return NextResponse.json(
        { error: `outcome must be one of ${HUMAN_OUTCOMES.join(", ")}` },
        { status: 400 }
      );
    }

    const note = typeof body.note === "string" ? body.note.trim() : "";

    const supabase = createAdminClient();

    // Read first so the event payload describes the real decision, and so a
    // caller cannot authorize something already closed by someone else.
    const { data: existing, error: readError } = await supabase
      .from("decisions")
      .select("id, title, entity_type, entity_id, status")
      .eq("id", decisionId)
      .single();

    if (readError || !existing) {
      return NextResponse.json({ error: readError?.message ?? "Decision not found" }, { status: 404 });
    }

    const prior = existing as Record<string, unknown>;
    if (!(OPEN_DECISION_STATUSES as readonly string[]).includes(asString(prior.status) ?? "")) {
      return NextResponse.json(
        { error: "This decision is already closed" },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    // Compare-and-swap: the status predicate lives in the UPDATE, not only in
    // the read above. Checking openness and then writing by id alone is a
    // TOCTOU race — two operators loading the same item both observe `proposed`
    // and both write, so the second authorization silently overwrites the first
    // and the ledger records one decision where two humans acted.
    const { data: updated, error: updateError } = await supabase
      .from("decisions")
      .update({
        status: outcome,
        outcome: note || null,
        decided_by: profile.id,
        decided_at: now,
        updated_at: now,
      })
      .eq("id", decisionId)
      .in("status", [...OPEN_DECISION_STATUSES])
      .select("id");

    if (updateError) {
      console.error("Mission Control decision update error:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json(
        { error: "This decision was just closed by someone else" },
        { status: 409 }
      );
    }

    // Best-effort telemetry: the authorization is already durable in
    // `decisions`, and recordEvent never throws, so a dropped event must not
    // fail an action a human just took.
    await recordEvent({
      eventType: "ADMIN_APPROVED",
      // `entityType`/`entityId` must describe the row this event is *about*,
      // which is the decision row. Pairing the decision's subject type with the
      // decision's own id — as an earlier draft here did — emits a `proposal`
      // event whose id is not a proposal id at all, so every consumer joining on
      // entity follows a dangling reference. The subject entity travels in the
      // payload instead, where a wrong value is inert.
      entityType: "decision",
      entityId: decisionId,
      actorType: "human",
      actorId: profile.id,
      autonomyLevel: 4,
      humanReviewed: true,
      payload: {
        decisionId,
        outcome,
        priorStatus: asString(prior.status),
        title: asString(prior.title),
        note: note || null,
        subjectEntityType: asString(prior.entity_type),
        subjectEntityId: asString(prior.entity_id),
      },
    });

    // A human authorization is the one action in the system that overrides the
    // gate's own conclusion, so it is written to `audit_log` and not only to
    // `decisions`. `overridden` distinguishes agreeing with a machine rejection
    // from plain approval, so the trail never reads as if the gate had allowed
    // the underlying action.
    await createAuditLog({
      tableName: "decisions",
      recordId: decisionId,
      action: "UPDATE",
      oldData: sanitizeForAudit({
        status: asString(prior.status),
        entity_type: asString(prior.entity_type),
        entity_id: asString(prior.entity_id),
        title: asString(prior.title),
      }),
      newData: sanitizeForAudit({
        status: outcome,
        overridden: outcome === "overridden",
        decided_by: profile.id,
        decided_at: now,
        note: note || null,
        subject_entity_type: asString(prior.entity_type),
        subject_entity_id: asString(prior.entity_id),
      }),
      performedBy: profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({ success: true, id: decisionId, status: outcome, decidedAt: now });
  } catch (err: unknown) {
    const authResponse = handleAuthError(err);
    if (authResponse) return authResponse;
    console.error("Error in PATCH /api/admin/mission-control:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
