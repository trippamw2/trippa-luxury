// ─── KORA — Optimization & Resilience Architect (Constitution §III, §XIV) ────
// The permanent auditor. KORA is the layer that makes the company honest with
// itself: it observes everything, detects where the system is failing its own
// constitution, and files findings with evidence.
//
// Two design decisions carry most of the weight here.
//
// 1. THE RULES LIVE IN TYPESCRIPT, NOT IN SQL. The database read produces a
//    plain `KoraMetrics` snapshot and every threshold — what counts as an
//    overdue enquiry, what margin is too thin — is applied in `runDetectors`.
//    A detector written as a `WHERE` clause can only be tested by populating a
//    live database; a detector written as a pure function is tested by naming
//    the case. That is the whole difference between an auditor you trust and
//    one you hope is right.
//
// 2. KORA PROPOSES; HUMANS DISPOSE. Every finding lands with
//    `requires_human_approval = true`, and KORA's own writes are routed
//    through the autonomy policy engine before they happen. An auditor that
//    can approve its own recommendations is not an auditor, it is a rubber
//    stamp. KORA is also structurally barred from sending anything or touching
//    money (see CAPABILITY_PERMISSIONS in autonomy-policy).
//
// The `now` clock is injected rather than read, so every detector is
// deterministic and a re-run produces byte-identical output for identical
// input — which is what makes the fingerprint dedup meaningful.

import {
  coerceAutonomyLevel,
  evaluateAutonomy,
  type AutonomyDecision,
  type AutonomyLevel,
} from "./autonomy-policy";
import { recordEvent } from "./event-bus";
import { createAdminClient } from "@/lib/supabase/admin";

export const KORA_ACTOR_ID = "kora-auditor";

// ─── Vocabulary (mirrors the migration 028 CHECK constraints) ────────────────

export type GapCategory =
  | "product"
  | "destination"
  | "supplier"
  | "pricing"
  | "conversion"
  | "experience"
  | "operational"
  | "data"
  | "automation"
  | "risk"
  | "moat"
  | "bottleneck"
  | "technology"
  | "security";

export type GapSeverity = "low" | "medium" | "high" | "critical";

export type GapStatus =
  | "open"
  | "proposed"
  | "approved"
  | "rejected"
  | "in_progress"
  | "resolved"
  | "dismissed";

export type InsightScope =
  | "client"
  | "journey"
  | "supplier"
  | "destination"
  | "commercial"
  | "operational"
  | "brand"
  | "moat";

export type EvidenceKind = "inquiry" | "proposal" | "supplier" | "journey";

export interface GapEvidence {
  kind: EvidenceKind;
  id: string;
  label: string;
  detail?: string;
}

// ─── The snapshot (what the database read produces) ─────────────────────────

export interface OpenInquiry {
  id: string;
  createdAt: string;
  /** SLA deadline from `inquiries.sla_due_at`; null means no deadline was set. */
  slaDueAt: string | null;
  firstRespondedAt: string | null;
  destination: string | null;
}

export interface OpenProposal {
  id: string;
  reference: string | null;
  sentAt: string | null;
  expiryDate: string | null;
  totalInvestment: number | null;
}

export interface SupplierRecord {
  id: string;
  name: string;
  contractOnFile: boolean;
  insuranceOnFile: boolean;
  rating: number | null;
  status: string | null;
}

export interface JourneyRecord {
  id: string;
  name: string;
  grossProfit: number | null;
  /** Already expressed as a percentage, e.g. 22.5 for 22.5%. */
  grossMarginPercent: number | null;
  totalSellingPrice: number | null;
}

export interface KoraMetrics {
  /** The injected clock. Every date comparison is against this. */
  now: string;
  openInquiries: OpenInquiry[];
  /** Proposals that were sent and have not been accepted. */
  openProposals: OpenProposal[];
  suppliers: SupplierRecord[];
  journeys: JourneyRecord[];
}

// ─── Thresholds (the constitution, expressed as numbers) ────────────────────

export interface KoraThresholds {
  /** Slack added to an enquiry SLA before KORA calls it a breach. */
  inquirySlaGraceHours: number;
  /** Days past `expiry_date` before an unaccepted proposal is called stale. */
  proposalExpiryGraceDays: number;
  /** Gross margin below this percentage is a pricing failure, not a strategy. */
  minJourneyMarginPercent: number;
  /** An enquiry older than this with no booking and no reply is abandoned. */
  staleInquiryDays: number;
  /** Evidence required before a finding is promoted to an insight hypothesis. */
  minEvidenceForInsight: number;
  /** The operating dial, so KORA's own writes are policy-checked. */
  companyLevel: AutonomyLevel;
}

export const DEFAULT_KORA_THRESHOLDS: KoraThresholds = {
  inquirySlaGraceHours: 2,
  proposalExpiryGraceDays: 0,
  minJourneyMarginPercent: 15,
  staleInquiryDays: 21,
  minEvidenceForInsight: 3,
  // Deliberately the same conservative default as the policy engine: KORA must
  // not be the first thing to run at a higher autonomy level.
  companyLevel: 2,
};

// ─── Pure scoring helpers ───────────────────────────────────────────────────

const SEVERITY_BASE: Record<GapSeverity, number> = {
  low: 10,
  medium: 25,
  high: 45,
  critical: 65,
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Priority = severity base + a log-scaled volume bonus.
 *
 * The bonus is logarithmic on purpose: the hundredth non-compliant supplier
 * is not ten times the problem of the tenth, and a linear scale would let any
 * single high-volume rule permanently own the top of the queue.
 */
export function priorityScoreFor(severity: GapSeverity, affectedCount: number): number {
  const volume = Math.min(30, Math.round(Math.log10(Math.max(0, affectedCount) + 1) * 15));
  return round2(SEVERITY_BASE[severity] + volume);
}

/**
 * Confidence in a *pattern* (not in an observation), derived only from how much
 * evidence stands behind it. KORA never returns "validated" — that is a human
 * judgement (constitution §XIV), and a machine that marks its own hypotheses
 * true has stopped auditing.
 */
export function confidenceFor(
  evidenceCount: number
): { score: number; level: "low" | "medium" | "high" } {
  if (evidenceCount >= 10) return { score: 80, level: "high" };
  if (evidenceCount >= 3) return { score: 55, level: "medium" };
  return { score: 30, level: "low" };
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Stable identity of a finding, so a re-run refreshes rather than duplicates. */
export function fingerprintFor(ruleId: string): string {
  return `kora:${ruleId}`;
}

// ─── The detectors (pure) ───────────────────────────────────────────────────

export interface GapFinding {
  ruleId: string;
  category: GapCategory;
  title: string;
  description: string;
  severity: GapSeverity;
  evidence: GapEvidence[];
  evidenceCount: number;
  businessImpact: string;
  recommendation: string;
  implementationPlan: string;
  expectedRoi: string;
  risk: string;
  /** KORA proposes; a human disposes. Always true by construction. */
  requiresHumanApproval: boolean;
  priorityScore: number;
  fingerprint: string;
}

/** The parts of a finding a detector writes by hand; the rest is derived. */
type GapFindingBase = Omit<
  GapFinding,
  "evidence" | "evidenceCount" | "priorityScore" | "fingerprint" | "requiresHumanApproval"
>;

/** Build a finding, deriving every numeric field so detectors cannot drift. */
function finding(ruleId: string, base: GapFindingBase, evidence: GapEvidence[]): GapFinding {
  return {
    ...base,
    evidence,
    evidenceCount: evidence.length,
    priorityScore: priorityScoreFor(base.severity, evidence.length),
    fingerprint: fingerprintFor(ruleId),
    requiresHumanApproval: true,
  };
}

function detectInquirySlaBreach(m: KoraMetrics, t: KoraThresholds): GapFinding | null {
  const now = Date.parse(m.now);
  if (!Number.isFinite(now)) return null;

  const evidence = m.openInquiries
    .filter((i) => i.slaDueAt !== null && i.firstRespondedAt === null)
    .filter((i) => {
      const due = Date.parse(i.slaDueAt as string);
      return Number.isFinite(due) && now > due + t.inquirySlaGraceHours * HOUR_MS;
    })
    .map((i) => ({
      kind: "inquiry" as const,
      id: i.id,
      label: `${i.destination ?? "unspecified destination"}`,
      detail: `SLA due ${i.slaDueAt}`,
    }));

  if (evidence.length === 0) return null;

  return finding(
    "inquiry-sla-breach",
    {
      ruleId: "inquiry-sla-breach",
      category: "operational",
      title: "Enquiries are waiting past their response deadline",
      description:
        "Inquiries have passed their SLA deadline without anyone responding. On a luxury travel business the first response is the product: an unanswered enquiry is revenue that has already been lost.",
      severity: evidence.length >= 5 ? "critical" : "high",
      businessImpact: `Lost inbound revenue on ${evidence.length} enquiry(s); a slow first reply also lowers the eventual booking value.`,
      recommendation:
        "Route unanswered enquiries to a daily first-response queue with a named owner, and alert the owner at the halfway point of the SLA rather than only when it is breached.",
      implementationPlan:
        "1. Add an SLA-breach cron that lists breached, unresponded enquiries. 2. Surface the queue on the admin dashboard. 3. Escalate to the operations lead after 24h.",
      expectedRoi: "Highest-leverage fix available: enquiry-to-booking conversion is the single most elastic number in the business.",
      risk: "Low. Internal process change only, no client-facing behaviour.",
    },
    evidence
  );
}

function detectNeverConvertedInquiries(m: KoraMetrics, t: KoraThresholds): GapFinding | null {
  const now = Date.parse(m.now);
  if (!Number.isFinite(now)) return null;

  const evidence = m.openInquiries
    .filter((i) => {
      const created = Date.parse(i.createdAt);
      return Number.isFinite(created) && now - created > t.staleInquiryDays * DAY_MS;
    })
    .map((i) => ({
      kind: "inquiry" as const,
      id: i.id,
      label: `${i.destination ?? "unspecified destination"}`,
      detail: `Raised ${i.createdAt}`,
    }));

  if (evidence.length === 0) return null;

  return finding(
    "inquiry-never-converted",
    {
      ruleId: "inquiry-never-converted",
      category: "conversion",
      title: "Old enquiries are neither answered nor converted",
      description: `Enquiries older than ${t.staleInquiryDays} days are still open. Either the follow-up loop has stopped or the qualification step is missing entirely.`,
      severity: "medium",
      businessImpact: `Pipeline value is being quietly written off: ${evidence.length} enquiry(s) are ageing with no recorded outcome.`,
      recommendation:
        "Give every open enquiry an explicit disposition — converted, nurturing, or closed-lost — and make 'closed-lost' with a reason a required outcome rather than an indefinite limbo.",
      implementationPlan:
        "1. Add a disposition field to the enquiry record. 2. Weekly report of ageing open enquiries by owner. 3. Close the loop on any enquiry older than the threshold.",
      expectedRoi: "Recovers clarity over pipeline value and prevents double-counting in forecasts.",
      risk: "Low. Reporting and process only.",
    },
    evidence
  );
}

function detectExpiredProposals(m: KoraMetrics, t: KoraThresholds): GapFinding | null {
  const now = Date.parse(m.now);
  if (!Number.isFinite(now)) return null;

  const evidence = m.openProposals
    .filter((p) => p.expiryDate !== null)
    .filter((p) => {
      const expiry = Date.parse(p.expiryDate as string);
      return Number.isFinite(expiry) && now > expiry + t.proposalExpiryGraceDays * DAY_MS;
    })
    .map((p) => ({
      kind: "proposal" as const,
      id: p.id,
      label: p.reference ?? p.id,
      detail: `Expired ${p.expiryDate}`,
    }));

  if (evidence.length === 0) return null;

  return finding(
    "proposal-expired-open",
    {
      ruleId: "proposal-expired-open",
      category: "conversion",
      title: "Expired proposals are still open against live pricing",
      description:
        "Proposals have passed their expiry date without being accepted, so supplier availability and pricing quoted to the client are no longer trustworthy. Acting on them risks confirming something we cannot deliver.",
      severity: evidence.length >= 3 ? "high" : "medium",
      businessImpact: `${evidence.length} proposal(s) represent pipeline value that is no longer deliverable as priced.`,
      recommendation:
        "Close expired proposals explicitly and trigger a re-pricing pass, rather than leaving them to be revived ad hoc when a client re-engages.",
      implementationPlan:
        "1. Mark expired proposals expired on a daily schedule. 2. Re-price on re-engagement. 3. Track expiry-to-revival rate as a pricing-accuracy signal.",
      expectedRoi: "Proterves delivery integrity and turns expiry data into a pricing-accuracy signal.",
      risk: "Medium. Touches commercial records; must not auto-resend anything to a client.",
    },
    evidence
  );
}

function detectSupplierCompliance(m: KoraMetrics): GapFinding | null {
  const evidence = m.suppliers
    .filter((s) => !s.contractOnFile || !s.insuranceOnFile)
    .map((s) => {
      const missing = [!s.contractOnFile ? "contract" : null, !s.insuranceOnFile ? "insurance" : null]
        .filter((x): x is string => x !== null)
        .join(" and ");
      return { kind: "supplier" as const, id: s.id, label: s.name, detail: `Missing ${missing}` };
    });

  if (evidence.length === 0) return null;

  return finding(
    "supplier-compliance-missing",
    {
      ruleId: "supplier-compliance-missing",
      category: "risk",
      title: "Suppliers are being used without complete compliance files",
      description:
        "Active suppliers lack a contract and/or insurance on file. This is the company's residual legal exposure: we arrange the experience, so the paper trail is our responsibility, not the operator's.",
      severity: evidence.length >= 3 ? "critical" : "high",
      businessImpact: `${evidence.length} supplier(s) carry unmitigated operational and legal risk on live itineraries.`,
      recommendation:
        "Block new bookings through a non-compliant supplier until the file is complete, and chase the missing documents with a named owner per supplier.",
      implementationPlan:
        "1. Weekly compliance digest to the operations lead. 2. Suppress non-compliant suppliers from new supplier matching. 3. Track a compliance status on each supplier.",
      expectedRoi: "Avoids the tail risk that dominates the downside of the whole business.",
      risk: "Low technical risk, real commercial friction: enforcement will block some bookings until paperwork arrives.",
    },
    evidence
  );
}

function detectMissingSupplierRatings(m: KoraMetrics): GapFinding | null {
  const evidence = m.suppliers
    .filter((s) => s.rating === null)
    .map((s) => ({ kind: "supplier" as const, id: s.id, label: s.name, detail: "No rating recorded" }));

  if (evidence.length === 0) return null;

  return finding(
    "supplier-rating-missing",
    {
      ruleId: "supplier-rating-missing",
      category: "data",
      title: "Supplier performance is unmeasured",
      description:
        "Suppliers carry no rating, so the company cannot rank them on evidence. Supplier selection is therefore preference rather than performance, which is exactly the habit the constitution forbids.",
      severity: "low",
      businessImpact: "Supplier choice is not evidence-based, so quality variance is invisible until a client complains.",
      recommendation:
        "Feed post-trip outcomes into the append-only supplier performance ledger so ratings are derived from delivered results rather than opinion.",
      implementationPlan:
        "1. Record an observation after every completed journey. 2. Derive the displayed rating from the ledger. 3. Re-rank supplier matching on the derived score.",
      expectedRoi: "Compounds into the supplier moat; the value is in the accumulated ledger, not the rating itself.",
      risk: "None. Derived data only.",
    },
    evidence
  );
}

function detectThinMarginJourneys(m: KoraMetrics, t: KoraThresholds): GapFinding | null {
  const evidence = m.journeys
    .filter((j) => {
      const margin = j.grossMarginPercent;
      const profit = j.grossProfit;
      if (typeof margin === "number" && margin < t.minJourneyMarginPercent) return true;
      // A recorded loss is a failure regardless of the stated margin.
      return typeof profit === "number" && profit <= 0;
    })
    .map((j) => ({
      kind: "journey" as const,
      id: j.id,
      label: j.name,
      detail:
        j.grossMarginPercent !== null
          ? `${round2(j.grossMarginPercent)}% margin, profit ${j.grossProfit ?? "unknown"}`
          : `profit ${j.grossProfit ?? "unknown"}`,
    }));

  if (evidence.length === 0) return null;

  return finding(
    "journey-thin-margin",
    {
      ruleId: "journey-thin-margin",
      category: "pricing",
      title: "Journeys are being sold below viable margin",
      description: `Journeys fall under the ${t.minJourneyMarginPercent}% gross-margin floor or record no profit. Either pricing is under-charging for the work, or supplier cost is being discovered after the price is quoted.`,
      severity: "high",
      businessImpact: `Margin is being consumed on ${evidence.length} journey(s); growth here loses money rather than making it.`,
      recommendation:
        "Introduce a pricing floor that blocks a proposal below the margin threshold, and review discount approvals against realised rather than quoted margin.",
      implementationPlan:
        "1. Enforce the margin floor in proposal generation. 2. Require explicit approval for any discount that breaches it. 3. Report realised vs quoted margin monthly.",
      expectedRoi: "Protects every pound of growth already being generated.",
      risk: "Medium. Will surface as lost deals if the floor is too aggressive; tune the threshold before enforcing.",
    },
    evidence
  );
}

/** All detectors, in descending business priority. */
const DETECTORS: ReadonlyArray<(m: KoraMetrics, t: KoraThresholds) => GapFinding | null> = [
  detectInquirySlaBreach,
  detectSupplierCompliance,
  detectThinMarginJourneys,
  detectExpiredProposals,
  detectNeverConvertedInquiries,
  detectMissingSupplierRatings,
];

/**
 * Run every detector over a snapshot. Pure and deterministic: the same metrics
 * and the same `now` always produce the same findings, in the same order.
 *
 * A detector that returns null simply found nothing; a detector that throws
 * would be a bug, so `runDetectors` does not swallow failures — a silent
 * auditor that skips a broken rule is worse than one that fails loudly.
 */
export function runDetectors(
  metrics: KoraMetrics,
  thresholds: KoraThresholds = DEFAULT_KORA_THRESHOLDS
): GapFinding[] {
  const findings: GapFinding[] = [];
  for (const detect of DETECTORS) {
    const result = detect(metrics, thresholds);
    if (result) findings.push(result);
  }
  return findings.sort((a, b) => b.priorityScore - a.priorityScore);
}

// ─── Insight hypotheses (a finding strong enough to generalise) ─────────────

export interface InsightHypothesis {
  title: string;
  statement: string;
  scope: InsightScope;
  pattern: Record<string, unknown>;
  evidence: GapEvidence[];
  evidenceCount: number;
  reasoningBasis: string;
  confidenceScore: number;
  confidenceLevel: "low" | "medium" | "high";
  /** Always "hypothesis": a machine may propose, never validate. */
  status: "hypothesis";
}

/**
 * Promote well-evidenced findings into falsifiable hypotheses.
 *
 * Only findings at high or critical severity with real evidence qualify. The
 * output is deliberately labelled `hypothesis` because promotion to
 * `validated` is a human act; KORA's job is to make that act cheap by arriving
 * with evidence already attached.
 */
export function toInsightHypotheses(
  findings: GapFinding[],
  thresholds: KoraThresholds = DEFAULT_KORA_THRESHOLDS
): InsightHypothesis[] {
  return findings
    .filter(
      (f) =>
        (f.severity === "high" || f.severity === "critical") &&
        f.evidenceCount >= thresholds.minEvidenceForInsight
    )
    .map((f) => {
      const confidence = confidenceFor(f.evidenceCount);
      return {
        title: `Pattern: ${f.title}`,
        statement: `${f.description} Observed across ${f.evidenceCount} case(s).`,
        scope: scopeForCategory(f.category),
        pattern: { ruleId: f.ruleId, category: f.category, severity: f.severity },
        evidence: f.evidence,
        evidenceCount: f.evidenceCount,
        reasoningBasis: `Derived from ${f.evidenceCount} recorded case(s) by the KORA audit run.`,
        confidenceScore: confidence.score,
        confidenceLevel: confidence.level,
        status: "hypothesis",
      };
    });
}

function scopeForCategory(category: GapCategory): InsightScope {
  switch (category) {
    case "supplier":
      return "supplier";
    case "pricing":
    case "conversion":
      return "commercial";
    case "destination":
      return "destination";
    case "operational":
    case "automation":
    case "bottleneck":
      return "operational";
    case "moat":
      return "moat";
    case "product":
    case "experience":
      return "journey";
    default:
      return "operational";
  }
}

// ─── Persistence ────────────────────────────────────────────────────────────

export interface GapUpsertRow {
  category: GapCategory;
  title: string;
  description: string;
  evidence: GapEvidence[];
  evidence_count: number;
  business_impact: string;
  severity: GapSeverity;
  priority_score: number;
  recommendation: string;
  implementation_plan: string;
  expected_roi: string;
  risk: string;
  requires_human_approval: boolean;
  fingerprint: string;
  detected_by: string;
  last_seen_at: string;
}

export interface InsightInsertRow {
  title: string;
  statement: string;
  scope: InsightScope;
  pattern: Record<string, unknown>;
  evidence: GapEvidence[];
  evidence_count: number;
  reasoning_basis: string;
  confidence_score: number;
  confidence_level: "low" | "medium" | "high";
  status: "hypothesis";
}

export function toGapRow(findingValue: GapFinding, now: string): GapUpsertRow {
  return {
    category: findingValue.category,
    title: findingValue.title,
    description: findingValue.description,
    evidence: findingValue.evidence,
    evidence_count: findingValue.evidenceCount,
    business_impact: findingValue.businessImpact,
    severity: findingValue.severity,
    priority_score: findingValue.priorityScore,
    recommendation: findingValue.recommendation,
    implementation_plan: findingValue.implementationPlan,
    expected_roi: findingValue.expectedRoi,
    risk: findingValue.risk,
    requires_human_approval: findingValue.requiresHumanApproval,
    fingerprint: findingValue.fingerprint,
    detected_by: KORA_ACTOR_ID,
    last_seen_at: now,
  };
}

export function toInsightRow(hypothesis: InsightHypothesis): InsightInsertRow {
  return {
    title: hypothesis.title,
    statement: hypothesis.statement,
    scope: hypothesis.scope,
    pattern: hypothesis.pattern,
    evidence: hypothesis.evidence,
    evidence_count: hypothesis.evidenceCount,
    reasoning_basis: hypothesis.reasoningBasis,
    confidence_score: hypothesis.confidenceScore,
    confidence_level: hypothesis.confidenceLevel,
    status: hypothesis.status,
  };
}

interface InsertResult {
  error: { message: string } | null;
}

export interface KoraStore {
  upsertGaps(rows: GapUpsertRow[]): PromiseLike<InsertResult>;
  insertInsights(rows: InsightInsertRow[]): PromiseLike<InsertResult>;
}

/**
 * Narrow backend view so the persistence layer is testable without a database.
 * `PromiseLike` because the Supabase builder is a thenable, not a Promise.
 */
interface KoraStoreBackend {
  from(table: string): {
    upsert(
      values: GapUpsertRow[],
      opts: { onConflict: string }
    ): PromiseLike<InsertResult>;
    insert(values: InsightInsertRow[]): PromiseLike<InsertResult>;
  };
}

export function createKoraStore(backend: KoraStoreBackend): KoraStore {
  return {
    upsertGaps: (rows) =>
      backend
        .from("system_gaps")
        // Deliberately omitting `status`: a re-detection must refresh the
        // evidence and priority without silently reopening a resolved gap.
        .upsert(rows, { onConflict: "fingerprint" }),
    insertInsights: (rows) => backend.from("insights").insert(rows),
  };
}

function createSupabaseKoraStore(): KoraStore {
  // Inline adapter for the same deeply-generic reason as the event bus.
  const supabase = createAdminClient();
  return {
    async upsertGaps(rows) {
      if (rows.length === 0) return { error: null };
      const { error } = await supabase
        .from("system_gaps")
        .upsert(rows, { onConflict: "fingerprint" });
      return { error: error ? { message: error.message } : null };
    },
    async insertInsights(rows) {
      if (rows.length === 0) return { error: null };
      const { error } = await supabase.from("insights").insert(rows);
      return { error: error ? { message: error.message } : null };
    },
  };
}

// ─── Audit run ──────────────────────────────────────────────────────────────

export interface KoraRunReport {
  startedAt: string;
  gapsDetected: number;
  gapsRecorded: number;
  hypothesesRaised: number;
  /** Set when KORA's own write was refused by the autonomy policy. */
  blockedReason: string | null;
  /** Present when the run degraded; the audit is a background activity and
   *  must never take down the schedule that invoked it. */
  error: string | null;
}

/**
 * Collect a metrics snapshot from the live database.
 *
 * All four reads are issued in parallel and any failure fails the snapshot
 * loudly. A KORA run that silently audited three of its four signals would
 * report "healthy" while blind, which is the one failure mode an auditor must
 * never have. `runKoraAudit` catches that and records it in the report, so the
 * failure stays visible without taking down the scheduled job.
 */
export async function collectMetrics(now: string): Promise<KoraMetrics> {
  const supabase = createAdminClient();
  const [inquiries, proposals, suppliers, journeys] = await Promise.all([
    supabase
      .from("inquiries")
      .select(
        "id, created_at, sla_due_at, first_response_at, destination, status, converted_to_booking_id"
      ),
    supabase
      .from("proposals")
      .select("id, proposal_reference, sent_date, expiry_date, accepted_date, total_investment"),
    supabase
      .from("suppliers")
      .select("id, name, contract_on_file, insurance_on_file, rating, status"),
    supabase
      .from("journeys")
      .select("id, journey_name, gross_profit, gross_margin, total_selling_price"),
  ]);

  const readError =
    inquiries.error || proposals.error || suppliers.error || journeys.error;
  if (readError) {
    throw new Error(
      `KORA could not read the platform: ${inquiries.error?.message ?? proposals.error?.message ?? suppliers.error?.message ?? journeys.error?.message ?? "unknown error"}`
    );
  }

  const rowValue = (row: Record<string, unknown>, key: string): unknown => row[key];
  const asNumber = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const asString = (value: unknown): string | null =>
    typeof value === "string" && value !== "" ? value : null;
  const asBoolean = (value: unknown): boolean => value === true;
  // Treats a missing key and an explicit null the same: both mean "not set",
  // and both must not be confused with a real value.
  const isUnset = (value: unknown): boolean => value === null || value === undefined;

  return {
    now,
    openInquiries: ((inquiries.data ?? []) as Record<string, unknown>[])
      // `booked` is the only terminal status this table has — verified against
      // the live vocabulary (new | read | contacted | qualified | booked). There
      // is no closed-lost state, so a converted enquiry is filtered on its
      // booking link rather than trusted to a status string.
      .filter((raw) => asString(rowValue(raw, "status")) !== "booked")
      .filter((raw) => isUnset(rowValue(raw, "converted_to_booking_id")))
      .map((raw) => ({
        id: String(rowValue(raw, "id")),
        createdAt: asString(rowValue(raw, "created_at")) ?? now,
        slaDueAt: asString(rowValue(raw, "sla_due_at")),
        firstRespondedAt: asString(rowValue(raw, "first_response_at")),
        destination: asString(rowValue(raw, "destination")),
      })),
    openProposals: ((proposals.data ?? []) as Record<string, unknown>[])
      // An accepted proposal is settled history, not an open one. Leaving it in
      // would report accepted work as "expiring".
      .filter((raw) => isUnset(rowValue(raw, "accepted_date")))
      .map((raw) => ({
        id: String(rowValue(raw, "id")),
        reference: asString(rowValue(raw, "proposal_reference")),
        sentAt: asString(rowValue(raw, "sent_date")),
        expiryDate: asString(rowValue(raw, "expiry_date")),
        totalInvestment: asNumber(rowValue(raw, "total_investment")),
      })),
    suppliers: ((suppliers.data ?? []) as Record<string, unknown>[]).map((raw) => ({
      id: String(rowValue(raw, "id")),
      name: asString(rowValue(raw, "name")) ?? "Unnamed supplier",
      contractOnFile: asBoolean(rowValue(raw, "contract_on_file")),
      insuranceOnFile: asBoolean(rowValue(raw, "insurance_on_file")),
      rating: asNumber(rowValue(raw, "rating")),
      status: asString(rowValue(raw, "status")),
    })),
    journeys: ((journeys.data ?? []) as Record<string, unknown>[]).map((raw) => ({
      id: String(rowValue(raw, "id")),
      name: asString(rowValue(raw, "journey_name")) ?? "Untitled journey",
      grossProfit: asNumber(rowValue(raw, "gross_profit")),
      grossMarginPercent: asNumber(rowValue(raw, "gross_margin")),
      totalSellingPrice: asNumber(rowValue(raw, "total_selling_price")),
    })),
  };
}

/**
 * Governance check for KORA's own write, extracted so it is testable without a
 * database.
 *
 * KORA states certain confidence because it is counting rows rather than
 * judging them — the honest report of a mechanical observation. The only thing
 * that can stop the write is the operating dial: at level 0 or 1 the company
 * observes and recommends, and KORA files nothing.
 */
export function evaluateKoraWrite(
  thresholds: KoraThresholds = DEFAULT_KORA_THRESHOLDS,
  findingsFound = 0
): AutonomyDecision {
  return evaluateAutonomy({
    capability: "kora",
    actionClass: "internal_write",
    companyLevel: coerceAutonomyLevel(thresholds.companyLevel),
    confidenceScore: 100,
    evidenceCount: findingsFound,
  });
}

/**
 * Execute one audit: read the platform, detect, persist, and record that the
 * run happened.
 *
 * Never throws. The caller is a scheduled job, and an auditor that takes down
 * the scheduler when the database hiccups has destroyed more trust than it
 * found.
 */
export async function runKoraAudit(
  thresholds: KoraThresholds = DEFAULT_KORA_THRESHOLDS
): Promise<KoraRunReport> {
  const now = new Date().toISOString();
  const report: KoraRunReport = {
    startedAt: now,
    gapsDetected: 0,
    gapsRecorded: 0,
    hypothesesRaised: 0,
    blockedReason: null,
    error: null,
  };

  try {
    const metrics = await collectMetrics(now);
    const findings = runDetectors(metrics, thresholds);
    const hypotheses = toInsightHypotheses(findings, thresholds);
    report.gapsDetected = findings.length;
    report.hypothesesRaised = hypotheses.length;

    // A clean audit is a successful outcome, not a blocked one.
    if (findings.length === 0) return report;

    // Governance: KORA's own write is checked before it happens.
    const decision = evaluateKoraWrite(thresholds, findings.length);
    if (!decision.allowed) {
      report.blockedReason = decision.reason;
      return report;
    }

    const store = createSupabaseKoraStore();
    const gapResult = await store.upsertGaps(findings.map((f) => toGapRow(f, now)));
    if (gapResult.error) {
      report.error = `Gap write failed: ${gapResult.error.message}`;
    } else {
      report.gapsRecorded = findings.length;
    }

    // Insights are strictly additive; a failure here must not mask the gaps.
    const insightResult = await store.insertInsights(hypotheses.map(toInsightRow));
    if (insightResult.error && !report.error) {
      report.error = `Insight write failed: ${insightResult.error.message}`;
    }

    // KORA is a first-class actor in the event stream (migration 028). The
    // event is an operational one, not a guest-journey event: this records
    // something the company did to itself.
    await recordEvent({
      eventType: "GAP_DETECTED",
      entityType: "kora_audit",
      actorType: "kora",
      actorId: KORA_ACTOR_ID,
      payload: {
        gapsDetected: report.gapsDetected,
        gapsRecorded: report.gapsRecorded,
        hypothesesRaised: report.hypothesesRaised,
        blocked: report.blockedReason !== null,
        error: report.error,
      },
      autonomyLevel: 1,
    });
  } catch (cause) {
    report.error = cause instanceof Error ? cause.message : String(cause);
  }

  return report;
}
