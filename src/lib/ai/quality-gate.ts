// ─── Kivara Quality Control Gate ───────────────────────────────────────────
// Validates a generated QuoteData / CuratedJourney before it reaches a guest.
// The QC gate is the "no sends a broken or embarrassing proposal" guardrail.
// It returns a deterministic verdict the pipeline can act on (pass, warn, fail).

import type { CuratedJourney, JourneyPricing } from "./types";
import { coerceAutonomyLevel, type AutonomyLevel } from "./autonomy-policy";
import { normalizeUuid } from "./uuid";
import { createAdminClient } from "@/lib/supabase/admin";

export type QcSeverity = "pass" | "warn" | "fail";

export interface QcIssue {
  severity: Exclude<QcSeverity, "pass">;
  code: string;
  message: string;
}

export interface QcVerdict {
  ok: boolean; // false if any "fail" severity issue exists
  severity: QcSeverity;
  issues: QcIssue[];
}

const EPSILON = 0.5; // $ tolerance for arithmetic rounding
const DEPOSIT_PERCENT = 30;
const MAX_TAX_PERCENT = 0.15;

function addIssue(
  issues: QcIssue[],
  severity: Exclude<QcSeverity, "pass">,
  code: string,
  message: string
): void {
  issues.push({ severity, code, message });
}

function worstSeverity(issues: QcIssue[]): QcSeverity {
  if (issues.some((i) => i.severity === "fail")) return "fail";
  if (issues.some((i) => i.severity === "warn")) return "warn";
  return "pass";
}

/** Check the derived deposit figure against the canonical deposit percentage. */
function checkDeposit(verdict: { issues: QcIssue[] }, journey: CuratedJourney, depositRequired: number): void {
  const expected = Math.round(journey.pricing.total * (DEPOSIT_PERCENT / 100));
  if (Math.abs(expected - depositRequired) > EPSILON) {
    addIssue(
      verdict.issues,
      "fail",
      "DEPOSIT_MISMATCH",
      `Deposit $${depositRequired} does not match ${DEPOSIT_PERCENT}% of total ($${expected}).`
    );
  }
}

/** Verify accommodation line items sum to the accommodation subtotal within rounding tolerance. */
function checkAccommodationSum(verdict: { issues: QcIssue[] }, pricing: JourneyPricing): void {
  const transferCost = pricing.transfers.reduce((sum, t) => sum + t.cost, 0);
  const accommodationSubtotal = pricing.subtotal - transferCost;
  const sumLineItems = pricing.accommodation.reduce((sum, a) => sum + a.subtotal, 0);
  if (Math.abs(sumLineItems - accommodationSubtotal) > EPSILON) {
    addIssue(
      verdict.issues,
      "fail",
      "ACCOMMODATION_SUM_MISMATCH",
      `Accommodation line items sum to $${sumLineItems} but subtotal implies $${accommodationSubtotal} (after excluding $${transferCost} transfers).`
    );
  }
  for (const item of pricing.accommodation) {
    const expected = Math.round(item.ratePerNight * item.nights);
    if (Math.abs(expected - item.subtotal) > EPSILON) {
      addIssue(
        verdict.issues,
        "warn",
        "ACCOMMODATION_ITEM_SUBTOTAL",
        `"${item.label}": $${item.ratePerNight}/night × ${item.nights} nights = $${expected}, but subtotal is $${item.subtotal}.`
      );
    }
  }
}

function checkPricingIntegrity(verdict: { issues: QcIssue[] }, journey: CuratedJourney): void {
  const p = journey.pricing;
  if (p.total <= 0) {
    addIssue(verdict.issues, "fail", "NONPOSITIVE_TOTAL", `Journey total ($${p.total}) is not positive.`);
  }
  if (p.subtotal <= 0) {
    addIssue(verdict.issues, "warn", "NONPOSITIVE_SUBTOTAL", `Journey subtotal ($${p.subtotal}) is not positive.`);
  }
  if (p.taxes < 0) {
    addIssue(verdict.issues, "fail", "NEGATIVE_TAXES", `Taxes ($${p.taxes}) must not be negative.`);
  }
  if (p.taxes > p.subtotal * MAX_TAX_PERCENT) {
    addIssue(
      verdict.issues,
      "warn",
      "TAXES_ABOVE_EXPECTED",
      `Taxes ($${p.taxes}) exceed ${Math.round(MAX_TAX_PERCENT * 100)}% of subtotal ($${Math.round(p.subtotal * MAX_TAX_PERCENT)}).`
    );
  }
  const sumOfParts = p.subtotal + p.taxes;
  if (Math.abs(sumOfParts - p.total) > EPSILON) {
    addIssue(
      verdict.issues,
      "fail",
      "TOTAL_MISMATCH",
      `Subtotal + taxes ($${sumOfParts}) does not equal total ($${p.total}).`
    );
  }
  if (p.accommodation.length === 0) {
    addIssue(verdict.issues, "fail", "NO_ACCOMMODATION", "Journey has no accommodation line items.");
  }
  for (const item of p.accommodation) {
    if (item.nights <= 0) {
      addIssue(verdict.issues, "fail", "INVALID_NIGHTS", `"${item.label}" has ${item.nights} nights (must be > 0).`);
    }
    if (item.ratePerNight <= 0) {
      addIssue(verdict.issues, "fail", "INVALID_RATE", `"${item.label}" has a non-positive rate-per-night ($${item.ratePerNight}).`);
    }
    if (item.ratePerNight > 5000) {
      addIssue(verdict.issues, "warn", "RATE_ABOVE_EXPECTED", `"${item.label}" rate-per-night ($${item.ratePerNight}) is unusually high — verify it is intentional.`);
    }
  }
}

function checkJourneyIntegrity(verdict: { issues: QcIssue[] }, journey: CuratedJourney): void {
  if (journey.duration <= 0) {
    addIssue(verdict.issues, "fail", "INVALID_DURATION", `Journey duration (${journey.duration} nights) must be > 0.`);
  }
  if (journey.destinations.length === 0) {
    addIssue(verdict.issues, "fail", "NO_DESTINATIONS", "Journey has no destinations.");
  }
  if (journey.itinerary.length === 0) {
    addIssue(verdict.issues, "fail", "NO_ITINERARY", "Journey has no itinerary days.");
  }
  const sumNights = journey.itinerary.reduce((sum, d) => sum + (d.accommodation ? 1 : 0), 0);
  if (sumNights > 0 && sumNights !== journey.duration) {
    addIssue(
      verdict.issues,
      "warn",
      "ITINERARY_NIGHTS_MISMATCH",
      `Itinerary covers ${sumNights} nights/relevant days but duration is ${journey.duration}.`
    );
  }
  if (!journey.title || journey.title.trim().length === 0) {
    addIssue(verdict.issues, "fail", "NO_TITLE", "Journey has no title.");
  }
  if (journey.highlights.length === 0) {
    addIssue(verdict.issues, "warn", "NO_HIGHLIGHTS", "Journey has no highlights — the proposal will feel thin.");
  }
  const guestName = journey.guestProfile?.name;
  if (!guestName || guestName.trim().length === 0) {
    addIssue(verdict.issues, "warn", "NO_GUEST_NAME", "Guest name is missing — the personalisation header will be blank.");
  }
}

/**
 * Run the full quality-control pass over a generated quote.
 * Returns a verdict; the caller decides whether to block, warn, or proceed.
 */
export function runQualityGate(
  journey: CuratedJourney,
  depositRequired?: number
): QcVerdict {
  const issues: QcIssue[] = [];
  const ctx = { issues };

  checkPricingIntegrity(ctx, journey);
  checkJourneyIntegrity(ctx, journey);
  if (journey.pricing.accommodation.length > 0) {
    checkAccommodationSum(ctx, journey.pricing);
  }
  if (typeof depositRequired === "number") {
    checkDeposit(ctx, journey, depositRequired);
  }

  const severity = worstSeverity(issues);
  return { ok: severity !== "fail", severity, issues };
}

export const QC_DEPOSIT_PERCENT = DEPOSIT_PERCENT;

// ─── Durable verdicts (Constitution §XIII) ──────────────────────────────────
//
// `runQualityGate` above is a pure function, and it stays that way. But a
// stateless verdict is a verdict nobody can learn from: the questions "which
// proposals have shipped broken pricing?" and "did this supplier's margin
// quietly change?" need a history, and a history needs rows.
//
// So verdicts are also written to `decisions` (migration 028). The mapping is
// deliberately honest about what a quality gate actually is:
//
//   confidence_score = 0. A gate that hard-fails `TOTAL_MISMATCH` is not
//     "95% confident" — it is certain, and certainty is not a confidence
//     claim. `confidence_score` means "how much evidence supports an
//     inference"; a deterministic check over the real object makes no
//     inference. Writing 100 here would corrupt the field for the rows that
//     genuinely are probabilistic.
//   evidence_count = defects surfaced, not evidence gathered. A clean pass is
//     0 defects; it is not 0 knowledge.
//   evidence_quality = 'strong', because the checks ran over the real
//     persisted object with exact arithmetic rather than a sample or a
//     summary.
//   decided_by / decided_at = null. A machine gate proposes; a human decides.
//     Filling these in at gate time would forge a human approval.

/** Mirrors the `decisions_risk_level_check` constraint. */
export type QcRiskLevel = "low" | "medium" | "high";

/** A subset of the `decisions_status_check` vocabulary. */
export type QcDecisionStatus = "approved" | "proposed" | "rejected";

export const QC_AGENT_NAME = "quality-gate";

export function riskLevelFor(severity: QcSeverity): QcRiskLevel {
  if (severity === "fail") return "high";
  if (severity === "warn") return "medium";
  return "low";
}

/**
 * How a verdict maps onto the decision lifecycle. A pass is "approved" because
 * the gate itself cleared the artifact; a warn is left "proposed" because a
 * human still owes it a look; a fail is "rejected" because the artifact as it
 * stands must not ship.
 */
export function decisionStatusFor(severity: QcSeverity): QcDecisionStatus {
  if (severity === "fail") return "rejected";
  if (severity === "warn") return "proposed";
  return "approved";
}

/** The snake_case shape sent to the `decisions` insert. */
export interface QcDecisionInsertRow {
  decision_type: string;
  title: string;
  rationale: string | null;
  recommendation: string | null;
  agent_name: string;
  entity_type: string;
  entity_id: string | null;
  confidence_score: number;
  evidence_count: number;
  evidence_quality: "unknown" | "weak" | "moderate" | "strong";
  autonomy_level: number;
  risk_level: QcRiskLevel;
  human_review_required: boolean;
  status: QcDecisionStatus;
}

export interface QcDecisionInput {
  verdict: QcVerdict;
  journeyTitle?: string | null;
  /** A UUID. Slug and order-number ids are carried as null, never cast. */
  journeyId?: string | null;
  autonomyLevel?: AutonomyLevel;
}

function summarize(verdict: QcVerdict): string {
  if (verdict.issues.length === 0) {
    return `All ${verdict.severity === "pass" ? "quality" : ""} checks passed.`;
  }
  return verdict.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.code}: ${i.message}`).join(" ");
}

function recommend(verdict: QcVerdict): string {
  if (verdict.severity === "fail") {
    return "Do not send. Correct the failing checks and re-run the quality gate.";
  }
  if (verdict.severity === "warn") {
    return "Review the warnings and confirm each is intentional before sending.";
  }
  return "Cleared to send.";
}

/**
 * Build the `decisions` row from a verdict. Pure, so every mapping rule above
 * is testable without a database.
 */
export function buildQcDecisionRow(input: QcDecisionInput): QcDecisionInsertRow {
  const { verdict } = input;
  const title = (input.journeyTitle ?? "").trim() || "Untitled journey";

  return {
    decision_type: "QUALITY_GATE",
    title: `${verdict.severity.toUpperCase()}: ${title}`,
    rationale: summarize(verdict),
    recommendation: recommend(verdict),
    agent_name: QC_AGENT_NAME,
    entity_type: "journey",
    entity_id: normalizeUuid(input.journeyId),
    confidence_score: 0,
    evidence_count: verdict.issues.length,
    evidence_quality: "strong",
    autonomy_level: coerceAutonomyLevel(input.autonomyLevel ?? 0),
    risk_level: riskLevelFor(verdict.severity),
    human_review_required: verdict.severity !== "pass",
    status: decisionStatusFor(verdict.severity),
  };
}

// ─── Write path ─────────────────────────────────────────────────────────────

export interface QcDecisionSink {
  // PromiseLike, not Promise: the Supabase query builder is a thenable, so
  // declaring Promise would make the real client structurally unassignable.
  insert(row: QcDecisionInsertRow): PromiseLike<{ error: { message: string } | null }>;
}

export interface QcDecisionOutcome {
  ok: boolean;
  row: QcDecisionInsertRow;
  error: string | null;
}

export function createQcDecisionSink(backend: {
  from(table: string): {
    insert(values: QcDecisionInsertRow): PromiseLike<{ error: { message: string } | null }>;
  };
}): QcDecisionSink {
  return {
    insert: (row) => backend.from("decisions").insert(row),
  };
}

export function createSupabaseQcDecisionSink(): QcDecisionSink {
  // Built inline rather than through createQcDecisionSink: matching Supabase's
  // deeply generic client against a structural interface trips an excessively
  // deep type instantiation. Env is read here, never at module load, so
  // importing this module without env vars does not throw.
  const supabase = createAdminClient();
  return {
    insert: async (row) => {
      const { error } = await supabase.from("decisions").insert(row);
      return { error: error ? { message: error.message } : null };
    },
  };
}

let cachedSink: QcDecisionSink | null = null;

function defaultSink(): QcDecisionSink {
  if (!cachedSink) cachedSink = createSupabaseQcDecisionSink();
  return cachedSink;
}

/**
 * Persist a verdict. Mirrors `recordEvent`: never throws and never rejects, so
 * a failed history write can neither roll back nor fail the send the gate was
 * protecting. The failure is returned as data for the caller to log.
 */
export async function recordQcDecision(
  input: QcDecisionInput,
  sink: QcDecisionSink = defaultSink()
): Promise<QcDecisionOutcome> {
  const row = buildQcDecisionRow(input);
  try {
    const { error } = await sink.insert(row);
    return { ok: error === null, row, error: error?.message ?? null };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, row, error: message };
  }
}
