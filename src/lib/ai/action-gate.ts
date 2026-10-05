// ─── Kivara Action Gate ────────────────────────────────────────────────────
// The enforcement point between an AI route and the constitution.
//
// Why this module exists: `evaluateAutonomy` encoded the capability matrix and
// the autonomy dial, but exactly one caller existed (`kora.ts`). A governance
// engine that gates a single path is documentation with a test suite, not a
// control. Every AI entry point now passes through here, so the separation of
// powers is enforced where work actually happens.
//
// ── The subtlety this module exists to get right ──────────────────────────
// `evaluateAutonomy` sets `allowed = !hardBlock && escalatedBy.length === 0`,
// so ANY escalation reason yields `allowed: false`. That includes reasons a
// human is *supposed* to resolve. The evaluator is a pure function and cannot
// see that a finance manager just clicked "send quote", so it reports the truth
// it knows: "this needs human authorization."
//
// Therefore this gate separates two outcomes that `allowed` conflates:
//
//   1. Hard blocks — `capability_not_permitted`, `record_pending_human_review`.
//      A human cannot wave these through, so the gate always refuses. Sterling
//      may never send, and nothing may act on a record under review.
//   2. Escalations the constitution intends a human to resolve — exceeding the
//      dial, low confidence, unstaged outbound. These are satisfied when the
//      request genuinely carries human authorization.
//
// Getting this backwards in either direction is a real bug: refusing
// everything breaks the finance module, while honouring escalation without
// proof of authorization is the unreviewed-outbound hole the constitution exists
// to close. `humanAuthorized` must therefore be asserted only where a human
// really decided this specific dispatch.
//
// The `decisions` ledger (migration 028) is the durable trail: an AI action that
// nobody recorded is indistinguishable from one that never happened.

import { NextResponse } from "next/server";
import {
  evaluateAutonomy,
  requiredLevelFor,
  type ActionClass,
  type AutonomyDecision,
  type AutonomyLevel,
  type Capability,
  type EscalationReason,
} from "@/lib/ai/autonomy-policy";
import { getGovernanceSettings, type GovernanceSettings } from "@/lib/ai/governance-settings";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reasons no human may override.
 *
 * These encode the constitution's structural limits rather than a judgement
 * call about this particular request, which is why they are refused even when
 * the route was admin-gated.
 */
const HARD_BLOCK_REASONS: readonly EscalationReason[] = [
  "capability_not_permitted",
  "record_pending_human_review",
];

export interface AiActionProfile {
  capability: Capability;
  actionClass: ActionClass;
  /** What the route produces, for the ledger and for error messages. */
  title: string;
  /**
   * A stated confidence, required for anything at level 2 or above. An action
   * taken with no stated confidence has in effect fabricated it, which is the
   * failure mode the constitution names explicitly. Deterministic routes state
   * 100; routes that call a model derive it.
   */
  confidenceScore?: number;
  /** Supporting observations. Only escalates when explicitly supplied. */
  evidenceCount?: number;
  /** Financial exposure, when the action has one. */
  amount?: number;
  /**
   * A human explicitly authorized *this* dispatch in *this* request — an admin
   * pressing the button on the record they are looking at.
   *
   * Only ever true for routes already behind `requireAdmin`. It must stay false
   * for anything scheduled or unattended, which is the whole distinction
   * between a concierge sending a quote a manager approved and a cron mailing
   * guests at 3am.
   */
  humanAuthorized?: boolean;
  /** The outbound artifact was composed and reviewed before dispatch. */
  staged?: boolean;
}

/**
 * What each AI entry point is permitted to do.
 *
 * Declared centrally so the mapping is reviewable in one place rather than
 * inferred from whatever each route happens to do. A route whose real action
 * drifts from its declared class is a governance bug, and this table is what
 * that drift would be caught against.
 *
 * Two mappings carry real weight:
 *  - Every route that actually dispatches to a guest is `orion`, because the
 *    matrix grants `outbound_message` to `orion` alone. Amara produces prose and
 *    never dispatches; KORA observes and never contacts anyone.
 *  - `trigger-reminders` is unattended, so it never claims human authorization.
 *    It also no longer sends: it composes into `staged_reminders` as an internal
 *    write, and the send happens in `dispatch-staged-reminders` behind a human.
 *    That is what satisfies the staging requirement instead of overriding it.
 */
export const AI_ACTION_PROFILES: Record<string, AiActionProfile> = {
  alternatives: { capability: "beatrice", actionClass: "recommend", title: "Journey alternatives" },
  curate: { capability: "beatrice", actionClass: "recommend", title: "Curated journey shortlist" },
  knowledge: { capability: "constantine", actionClass: "recommend", title: "Guest knowledge lookup" },
  orchestrator: { capability: "cadc", actionClass: "recommend", title: "Journey orchestration" },
  proposal: {
    capability: "beatrice",
    actionClass: "draft",
    title: "Journey proposal draft",
    // A draft is submitted FOR human review, not committed, so the stated
    // confidence is the review threshold rather than a claim of correctness.
    // The route may override this with a measured value; leaving it unset would
    // escalate as `confidence_not_assessed` and block the route at every dial.
    confidenceScore: 70,
  },
  prospect: { capability: "sterling", actionClass: "recommend", title: "Lead qualification" },
  romance: {
    capability: "amara",
    actionClass: "draft",
    title: "Narrative copy draft",
    // As above: prose for review, never dispatched.
    confidenceScore: 70,
  },
  workflow: {
    capability: "beatrice",
    actionClass: "internal_write",
    title: "Journey generation",
    confidenceScore: 100,
  },
  // Inbound inquiry captures a real lead and writes a row. It notifies the
  // business, not the guest, so it is an internal write rather than outbound.
  inquiry: {
    capability: "constantine",
    actionClass: "internal_write",
    title: "Inbound inquiry capture",
    confidenceScore: 100,
  },

  // ── Dispatch routes. Orion is the only capability that may send, and each
  // ── of these is authorized by a finance manager on the record itself.
  "send-quote": {
    capability: "orion",
    actionClass: "outbound_message",
    title: "Quote dispatch to guest",
    confidenceScore: 100,
    humanAuthorized: true,
    staged: true,
  },
  "send-receipt": {
    capability: "orion",
    actionClass: "outbound_message",
    title: "Receipt dispatch to guest",
    confidenceScore: 100,
    humanAuthorized: true,
    staged: true,
  },
  "send-payment-link": {
    capability: "orion",
    actionClass: "outbound_message",
    title: "Payment link dispatch to guest",
    confidenceScore: 100,
    humanAuthorized: true,
    staged: true,
  },

  // ── Staging. Unattended, and deliberately not an outbound action ────────
  // This used to compose AND send in one step, which made it unstaged outbound
  // from a cron: a structural refusal at every autonomy level, so reminders
  // could not run at all. Rather than weaken the rule, the flow is split in
  // two. Composition is now an internal write — it touches only `staged_reminders`
  // and contacts nobody — so it is reversible and permitted without a human.
  //
  // The confidence is 100 because the templates are deterministic: the content
  // comes from `reminderEngine`, not from a model, so there is no inference to
  // be uncertain about. That is a claim about THIS code path, and stating it is
  // what lets the route pass the confidence gate honestly.
  "trigger-reminders": {
    capability: "orion",
    actionClass: "internal_write",
    title: "Compose booking reminders for review",
    confidenceScore: 100,
    // No human touched this dispatch — it is a nightly cron. It therefore does
    // NOT claim authorization, and it does not need to: staging is reversible
    // and invisible to the guest.
  },

  // ── Dispatch. Admin-gated, and the only step that may contact a guest ───
  // Sends exactly the rows an operator approved, byte for byte. `staged` is
  // true because the message was composed and read before this call, and
  // `humanAuthorized` is true because a named admin approved these specific
  // rows — `dispatch-staged-reminders` is the one place that assertion is
  // earned rather than asserted.
  "dispatch-staged-reminders": {
    capability: "orion",
    actionClass: "outbound_message",
    title: "Dispatch reviewed booking reminders",
    confidenceScore: 100,
    humanAuthorized: true,
    staged: true,
  },
};

export type AuthorizationSource = "policy" | "human" | "switch" | null;

export interface ActionGateResult {
  /** True when the action may proceed. */
  allowed: boolean;
  decision: AutonomyDecision;
  /** The dial that was applied, for the ledger. */
  companyLevel: AutonomyLevel;
  /** Set when a kill switch, not the constitution, stopped the action. */
  blockedBySwitch: string | null;
  /** Why it was allowed, so the ledger records the real basis. */
  authorizedBy: AuthorizationSource;
  /** True when a human's authorization was what unblocked this action. */
  humanAuthorized: boolean;
  /**
   * The quality signals this decision was actually evaluated against.
   *
   * Carried on the result rather than re-read from the profile so the ledger
   * records the numbers the decision rested on. A route that measured its own
   * confidence must have that number persisted; recording the profile default
   * instead would make the trail lie about why the action was allowed.
   */
  confidenceScore?: number;
  evidenceCount?: number;
  amount?: number;
}

export class ActionBlockedError extends Error {
  readonly status: number;
  readonly result: ActionGateResult;

  constructor(message: string, result: ActionGateResult, status = 403) {
    super(message);
    this.name = "ActionBlockedError";
    this.status = status;
    this.result = result;
  }
}

/**
 * Evaluate an action against the operator's current settings and the
 * constitution. Pure with respect to the policy; the only I/O is reading the
 * dial, which `getGovernanceSettings` caches briefly.
 */
export async function evaluateAction(
  profile: AiActionProfile,
  options?: {
    settings?: GovernanceSettings;
    pendingHumanReview?: boolean;
    evidenceCount?: number;
    confidenceScore?: number;
    /**
     * Financial exposure for THIS request. A dispatch route knows the amount it
     * is about to send, and that is exactly the value `high_value_exposure`
     * needs in order to force the question "who signed off on this much?".
     */
    amount?: number;
  }
): Promise<ActionGateResult> {
  const settings = options?.settings ?? (await getGovernanceSettings());
  const companyLevel = settings.autonomyLevel;

  // The kill switches are checked before the constitution so that an operator
  // pulling the lever gets the same outcome every time, without having to reason
  // about which action class the route happens to declare.
  if (profile.actionClass === "outbound_message" && !settings.outboundEnabled) {
    return switchBlocked(profile, companyLevel, "governance.ai_outbound_enabled");
  }

  if (profile.actionClass === "internal_write" && !settings.internalWritesEnabled) {
    return switchBlocked(profile, companyLevel, "governance.ai_internal_writes_enabled");
  }

  const confidenceScore = options?.confidenceScore ?? profile.confidenceScore;
  const evidenceCount = options?.evidenceCount ?? profile.evidenceCount;
  const amount = options?.amount ?? profile.amount;

  const decision = evaluateAutonomy({
    capability: profile.capability,
    actionClass: profile.actionClass,
    companyLevel,
    pendingHumanReview: options?.pendingHumanReview,
    staged: profile.staged,
    confidenceScore,
    evidenceCount,
    amount,
  });

  const hardBlocked = decision.escalatedBy.some((reason) => HARD_BLOCK_REASONS.includes(reason));
  const humanAuthorized = profile.humanAuthorized === true;

  // A hard block stands regardless of who clicked. Otherwise the action runs
  // only if the constitution already cleared it, or a human authorized it.
  const allowed = hardBlocked ? false : decision.allowed || humanAuthorized;

  return {
    allowed,
    decision,
    companyLevel,
    blockedBySwitch: null,
    authorizedBy: allowed ? (decision.allowed ? "policy" : "human") : null,
    humanAuthorized,
    confidenceScore,
    evidenceCount,
    amount,
  };
}

function switchBlocked(
  profile: AiActionProfile,
  companyLevel: AutonomyLevel,
  switchKey: string
): ActionGateResult {
  // A switch is an operator pause, not a judgement about the action, so the
  // required level is reported for context but the switch is the real reason.
  const reason =
    switchKey === "governance.ai_outbound_enabled"
      ? "AI outbound communication is switched off by an operator."
      : "AI internal writes are switched off by an operator.";

  return {
    allowed: false,
    companyLevel,
    blockedBySwitch: switchKey,
    authorizedBy: "switch",
    humanAuthorized: false,
    // Not evaluated: the switch fired first, so there is no basis to record.
    confidenceScore: undefined,
    evidenceCount: undefined,
    amount: undefined,
    decision: {
      allowed: false,
      requiresHumanReview: true,
      requiredLevel: requiredLevelFor(profile.actionClass),
      effectiveLevel: companyLevel,
      reason,
      escalatedBy: ["exceeds_company_autonomy_level"],
    },
  };
}

/**
 * Evaluate and throw if the action may not proceed.
 *
 * Use at the top of a route so a refused action costs nothing. The error carries
 * the full decision so the caller can convert it into a response and the ledger
 * entry without re-deriving anything.
 */
export async function requireAction(
  profile: AiActionProfile,
  options?: {
    settings?: GovernanceSettings;
    pendingHumanReview?: boolean;
    evidenceCount?: number;
    confidenceScore?: number;
    amount?: number;
  }
): Promise<ActionGateResult> {
  const result = await evaluateAction(profile, options);
  if (!result.allowed) {
    throw new ActionBlockedError(result.decision.reason, result);
  }
  return result;
}

/**
 * Write the decision to the ledger.
 *
 * Best effort by design: a governance ledger that can fail an otherwise healthy
 * request trains operators to ignore it. Failures are logged loudly instead.
 */
export async function recordDecision(
  result: ActionGateResult,
  profile: AiActionProfile,
  context?: { entityType?: string; entityId?: string | null; outcome?: string }
): Promise<void> {
  // Read the quality signals off the result, not the profile. The route may have
  // measured its own confidence or evidence count, and the ledger has to record
  // what the decision actually rested on.
  const confidenceScore = result.confidenceScore ?? profile.confidenceScore ?? 0;
  const evidenceCount = result.evidenceCount ?? profile.evidenceCount ?? 0;

  // High-value exposure is a risk fact about the action, independent of who
  // authorized it, so it must survive into the ledger even on an allowed send.
  const highValue = result.decision.escalatedBy.includes("high_value_exposure");
  const riskLevel = !result.allowed
    ? "high"
    : highValue
      ? "high"
      : result.authorizedBy === "human"
        ? "medium"
        : "low";

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("decisions").insert({
      decision_type: result.allowed ? "autonomous" : "blocked",
      title: profile.title,
      rationale: result.decision.reason,
      recommendation: result.allowed
        ? result.authorizedBy === "human"
          ? "Proceeded on explicit human authorization."
          : "Proceeded within the current autonomy level."
        : null,
      agent_name: profile.capability,
      entity_type: context?.entityType ?? null,
      entity_id: context?.entityId ?? null,
      confidence_score: confidenceScore,
      evidence_count: evidenceCount,
      evidence_quality: evidenceCount > 0 ? "supported" : "unknown",
      risk_level: riskLevel,
      human_review_required: result.decision.requiresHumanReview,
      // A human-authorized action is decided, not merely proposed.
      status: result.allowed ? (result.authorizedBy === "human" ? "approved" : "executed") : "proposed",
      outcome: context?.outcome ?? result.blockedBySwitch,
    });
    if (error) throw error;
  } catch (error) {
    console.error("Failed to record governance decision:", error instanceof Error ? error.message : error);
  }
}

/**
 * Turn a refusal into a response.
 *
 * 503 when a switch stopped it, because the system is deliberately paused and
 * retrying later is the right client behaviour. 403 when the constitution
 * refused, because no amount of retrying changes the answer.
 */
export function actionBlockedResponse(error: ActionBlockedError): NextResponse {
  const bySwitch = error.result.blockedBySwitch !== null;
  return NextResponse.json(
    {
      error: error.message,
      governance: {
        blockedBy: error.result.blockedBySwitch ?? "policy",
        autonomyLevel: error.result.companyLevel,
        requiredLevel: error.result.decision.requiredLevel,
        escalatedBy: error.result.decision.escalatedBy,
      },
    },
    { status: bySwitch ? 503 : error.status }
  );
}

/**
 * Convenience wrapper for a route: evaluate, record, and throw on refusal.
 *
 * `overrides` carries per-request facts — a measured confidence, an evidence
 * count — so the ledger entry describes this request rather than the route's
 * static shape.
 */
export async function gateAiAction(
  routeKey: string,
  overrides?: Partial<AiActionProfile>,
  options?: {
    pendingHumanReview?: boolean;
    evidenceCount?: number;
    confidenceScore?: number;
    amount?: number;
    entityType?: string;
    entityId?: string | null;
    record?: boolean;
  }
): Promise<ActionGateResult> {
  const base = AI_ACTION_PROFILES[routeKey];
  if (!base) {
    // A new AI route that has not declared its action class is a governance
    // hole, not something to default quietly.
    throw new Error(`AI route "${routeKey}" has no declared action profile in AI_ACTION_PROFILES`);
  }

  // Guard the invariant that matters most: a route may not assert human
  // authorization that its static profile does not claim. The scheduled,
  // unattended routes must stay unattended.
  const humanAuthorized = overrides?.humanAuthorized ?? base.humanAuthorized ?? false;
  if (humanAuthorized && !base.humanAuthorized) {
    throw new Error(
      `AI route "${routeKey}" is not human-authorized by policy and may not assert human authorization`
    );
  }

  const profile: AiActionProfile = { ...base, ...overrides, humanAuthorized };

  // `evaluateAction` rather than `requireAction`: the latter throws on refusal,
  // which would skip the ledger write below and leave every blocked action
  // unrecorded. That is the specific failure this module exists to prevent — an
  // AI action nobody recorded is indistinguishable from one that never
  // happened, and a refusal is precisely the event an auditor most needs to see.
  // The verdict is therefore persisted *before* the error propagates.
  const result = await evaluateAction(profile, options);

  if (options?.record !== false) {
    await recordDecision(result, profile, {
      entityType: options?.entityType,
      entityId: options?.entityId,
      outcome: result.blockedBySwitch ?? undefined,
    });
  }

  if (!result.allowed) {
    throw new ActionBlockedError(result.decision.reason, result);
  }

  return result;
}