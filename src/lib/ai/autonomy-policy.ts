// ─── KIVARA Autonomy Policy Engine (Constitution §XI–XIV) ───────────────────
// The machine-enforced half of "95% AI / 5% human".
//
// Before this module, Kivara had ~40 AI capabilities and no autonomy
// governance: every agent call either executed or didn't, and nothing recorded
// why. The constitution requires three things this engine now provides:
//
//   1. CAPABILITY PERMISSION — a capability may not perform an action class it
//      was never granted (Beatrice designs journeys; she does not send email).
//   2. AUTONOMY LEVELS 0–4 — every action class carries a required level, and
//      the company's operating level is a dial. Anything above the dial is
//      routed to a human. Level 4 (financial commitments, supplier contracts,
//      irreversible bookings, refunds, exceptional discounts, legal) is
//      ALWAYS a human decision, at any dial position.
//   3. RUNTIME GATES — low confidence, absent evidence, an un-staged outbound
//      message, a record under human review, or high-value exposure each force
//      escalation regardless of class.
//
// Design note: this module is deliberately PURE. It performs no I/O and reads
// no configuration, so the governance rules are exhaustively unit-testable and
// cannot drift from the database. Callers supply the operating dial and the
// runtime facts; persistence of the decision belongs to the `decisions` table
// (migration 028) and the event bus, not here.
//
// "95% autonomous" is NOT a hardcoded 95. It is an emergent property of the
// dial: at level 3 the engine clears routine operational work automatically
// and escalates only the consequential residue. The KPI to watch is human
// minutes per $1,000 of revenue, not an autonomy percentage.

/** Constitution §XII. Level 4 is never delegated to a machine. */
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

export const AUTONOMY_LEVEL_LABELS: Record<AutonomyLevel, string> = {
  0: "Observe",
  1: "Recommend",
  2: "Execute low-risk",
  3: "Autonomous operations",
  4: "Human authorization",
};

/**
 * The six intelligence layers of the constitution, plus the coordinating core.
 * These are capabilities, not separate processes (constitution §III).
 */
export type Capability =
  | "cadc"
  | "constantine"
  | "beatrice"
  | "sterling"
  | "amara"
  | "orion"
  | "kora";

export const CAPABILITY_LABELS: Record<Capability, string> = {
  cadc: "CADC — Central Autonomous Director Core",
  constantine: "Constantine — Client Intelligence",
  beatrice: "Beatrice — Journey Architecture",
  sterling: "Sterling — Commercial Intelligence",
  amara: "Amara — Narrative & Brand Intelligence",
  orion: "Orion — Execution & Communications",
  kora: "KORA — Optimization & Resilience Architect",
};

/**
 * Action classes, ordered from least to most consequential. The ordering is
 * load-bearing: `requiredLevel` below is keyed by class and is deliberately
 * monotonic, so a more consequential class can never require less authority.
 */
export type ActionClass =
  | "observe"
  | "recommend"
  | "draft"
  | "internal_write"
  | "outbound_message"
  | "supplier_commitment"
  | "financial_commitment"
  | "contractual";

export const ACTION_CLASS_LABELS: Record<ActionClass, string> = {
  observe: "Read platform state",
  recommend: "Produce a recommendation",
  draft: "Create a staged artifact (not externally visible)",
  internal_write: "Reversible internal state change",
  outbound_message: "Send a message to a client or guest",
  supplier_commitment: "Request, confirm or cancel with a supplier",
  financial_commitment: "Payment, refund or exceptional discount",
  contractual: "Contractual or legal commitment",
};

/** Constitution §XII: the authority each action class demands. */
const REQUIRED_LEVEL: Record<ActionClass, AutonomyLevel> = {
  observe: 0,
  recommend: 1,
  draft: 2,
  internal_write: 2,
  outbound_message: 3,
  // The constitution names these explicitly as always-human, regardless of dial.
  supplier_commitment: 4,
  financial_commitment: 4,
  contractual: 4,
};

export function requiredLevelFor(actionClass: ActionClass): AutonomyLevel {
  return REQUIRED_LEVEL[actionClass];
}

/**
 * Constitution §III: which layer owns which action class.
 *
 * Note the deliberate split of powers:
 *  - Sterling NEVER sends anything and NEVER touches money directly. It
 *    computes and recommends; Orion executes; and any actual movement of funds
 *    is level 4, i.e. human-authorized.
 *  - KORA never sends, never spends, and never contacts a guest. It observes
 *    the whole company and writes findings. An auditor that can email clients
 *    is not an auditor.
 *  - Amara produces narrative text only. Making her capable of dispatch would
 *    put unreviewed prose in front of clients.
 */
const CAPABILITY_PERMISSIONS: Record<Capability, readonly ActionClass[]> = {
  cadc: ["observe", "recommend", "draft"],
  constantine: ["observe", "recommend", "draft", "internal_write"],
  beatrice: ["observe", "recommend", "draft", "internal_write"],
  sterling: ["observe", "recommend", "draft", "internal_write"],
  amara: ["observe", "recommend", "draft"],
  orion: [
    "observe",
    "recommend",
    "draft",
    "internal_write",
    "outbound_message",
    "supplier_commitment",
    "financial_commitment",
  ],
  kora: ["observe", "recommend", "draft", "internal_write"],
};

export function capabilityMay(action: Capability, actionClass: ActionClass): boolean {
  return CAPABILITY_PERMISSIONS[action].includes(actionClass);
}

export function permissionsFor(action: Capability): readonly ActionClass[] {
  return CAPABILITY_PERMISSIONS[action];
}

/** Why a decision escalated — useful for the audit trail and the admin UI. */
export type EscalationReason =
  | "capability_not_permitted"
  | "consequential_action_class"
  | "exceeds_company_autonomy_level"
  | "record_pending_human_review"
  | "outbound_not_staged"
  | "low_confidence"
  | "confidence_not_assessed"
  | "insufficient_evidence"
  | "high_value_exposure";

export interface AutonomyPolicyInput {
  /** Which layer is acting. */
  capability: Capability;
  /** What it wants to do. */
  actionClass: ActionClass;
  /** The company's current operating dial (constitution §XII). */
  companyLevel: AutonomyLevel;
  /** The record's operational status is PENDING_HUMAN_REVIEW. */
  pendingHumanReview?: boolean;
  /** The outbound artifact has been through STAGED_UNSENT. */
  staged?: boolean;
  /** Model confidence in the underlying recommendation, 0–100. */
  confidenceScore?: number;
  /** How many observations back the recommendation. */
  evidenceCount?: number;
  /** Financial exposure in the account currency, when the action has one. */
  amount?: number;
}

/** Minimum confidence to act unreviewed at level 2 or above. */
export const DEFAULT_MIN_CONFIDENCE = 70;
/** Minimum supporting observations to act unreviewed at level 2 or above. */
export const DEFAULT_MIN_EVIDENCE = 1;
/** Exposure above which a human is always required, even inside the dial. */
export const DEFAULT_HIGH_VALUE_THRESHOLD = 5_000;

export interface AutonomyDecision {
  /** May the action proceed right now? False means hard-blocked. */
  allowed: boolean;
  /** Must a human clear this before it proceeds? */
  requiresHumanReview: boolean;
  /** Authority the action class demands. */
  requiredLevel: AutonomyLevel;
  /** Lowest level at which this action would be permitted by the dial. */
  effectiveLevel: AutonomyLevel;
  /** Human-readable justification, always populated. */
  reason: string;
  /** Every rule that fired, in evaluation order. */
  escalatedBy: EscalationReason[];
}

function describe(reasons: EscalationReason[]): string {
  switch (reasons[0]) {
    case "capability_not_permitted":
      return "Capability is not permitted to perform this action class.";
    case "consequential_action_class":
      return "Consequential action class (supplier, financial or contractual) requires explicit human authorization at every autonomy level.";
    case "exceeds_company_autonomy_level":
      return "Action requires more authority than the company's current operating level.";
    case "record_pending_human_review":
      return "Record is pending human review; no external action is permitted until a human clears it.";
    case "outbound_not_staged":
      return "Outbound communication must be staged (STAGED_UNSENT) before it can be sent.";
    case "low_confidence":
      return "Confidence is below the threshold required to act without review.";
    case "confidence_not_assessed":
      return "No confidence was stated; the company must not act on unstated confidence.";
    case "insufficient_evidence":
      return "Too few supporting observations to act without review.";
    case "high_value_exposure":
      return "Financial exposure exceeds the automatic-execution threshold.";
    default:
      return "Permitted within the company's current autonomy level.";
  }
}

/**
 * Evaluate a proposed action against the full governance stack.
 *
 * Hard blocks (allowed === false) are reserved for two cases: a capability
 * attempting an action it was never granted, and acting on a record that is
 * under human review. Everything else escalates to review rather than being
 * refused, because a proposal awaiting a human is a normal state of the
 * company, not an error.
 */
export function evaluateAutonomy(input: AutonomyPolicyInput): AutonomyDecision {
  const {
    capability,
    actionClass,
    companyLevel,
    pendingHumanReview = false,
    staged = false,
    confidenceScore,
    evidenceCount,
    amount,
  } = input;

  const minConfidence = DEFAULT_MIN_CONFIDENCE;
  const minEvidence = DEFAULT_MIN_EVIDENCE;
  const highValueThreshold = DEFAULT_HIGH_VALUE_THRESHOLD;

  const requiredLevel = REQUIRED_LEVEL[actionClass];
  const reasons: EscalationReason[] = [];
  let hardBlock = false;

  // 1. Capability permission — the constitutional separation of powers.
  if (!capabilityMay(capability, actionClass)) {
    reasons.push("capability_not_permitted");
    hardBlock = true;
  }

  // 2. Consequential classes are never machine-authorized.
  if (requiredLevel === 4) {
    reasons.push("consequential_action_class");
  }

  // 3. The company dial.
  if (requiredLevel > companyLevel) {
    reasons.push("exceeds_company_autonomy_level");
  }

  // 4. A record under human review is frozen against all external action.
  if (pendingHumanReview) {
    reasons.push("record_pending_human_review");
    hardBlock = true;
  }

  // 5. Outbound communication must be staged before dispatch. Drafting is the
  //    only self-service option; sending is what needs the dial.
  if (actionClass === "outbound_message" && !staged) {
    reasons.push("outbound_not_staged");
  }

  // 6-7. Quality-signal discipline for anything that acts rather than merely
  //      observes.
  //      Confidence is the universal gate. An action taken with NO stated
  //      confidence has, in effect, fabricated it — the failure mode the
  //      constitution names explicitly. So an absent score escalates exactly
  //      like a low one. Callers running deterministic work (a booking
  //      confirmation) should pass an explicit high score rather than omit the
  //      field; the audit trail is worth the one extra argument.
  //      Evidence is deliberately asymmetric: it only fires when explicitly
  //      zero. A deterministic action has no observation base by definition,
  //      so demanding a count would reject every routine message.
  const actsRatherThanObserves = requiredLevel >= 2;
  if (actsRatherThanObserves) {
    if (typeof confidenceScore !== "number") {
      reasons.push("confidence_not_assessed");
    } else if (confidenceScore < minConfidence) {
      reasons.push("low_confidence");
    }
    if (typeof evidenceCount === "number" && evidenceCount < minEvidence) {
      reasons.push("insufficient_evidence");
    }
  }

  // 8. High-value exposure always reaches a human.
  if (typeof amount === "number" && amount > highValueThreshold) {
    reasons.push("high_value_exposure");
  }

  // Deduplicate while preserving first-seen order.
  const escalatedBy = reasons.filter((r, i) => reasons.indexOf(r) === i);

  // The effective level is what the dial would have to be raised to in order
  // for this action to run unattended.
  const effectiveLevel: AutonomyLevel =
    escalatedBy.length === 0 ? requiredLevel : companyLevel;

  return {
    allowed: !hardBlock && escalatedBy.length === 0,
    requiresHumanReview: escalatedBy.length > 0,
    requiredLevel,
    effectiveLevel,
    reason: describe(escalatedBy),
    escalatedBy,
  };
}

/**
 * Kivara's starting operating level.
 *
 * Level 2 — the system executes predefined, reversible internal work on its own
 * and routes anything consequential to a human. This is deliberately not 3:
 * the runtime gates (staging, confidence, the decisions ledger, KORA) are only
 * now being stood up, and running at 3 before they exist would mean
 * unreviewed outbound communication with no audit trail.
 */
export const DEFAULT_COMPANY_AUTONOMY_LEVEL: AutonomyLevel = 2;

/** Clamp an arbitrary value (config, DB, env) into a valid dial position. */
export function coerceAutonomyLevel(value: unknown): AutonomyLevel {
  // Number(null) and Number("") are both 0, which would read as "explicitly
  // locked down" rather than "never configured". Treat empty values as unset.
  if (value === null || value === undefined || value === "") {
    return DEFAULT_COMPANY_AUTONOMY_LEVEL;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_COMPANY_AUTONOMY_LEVEL;
  const clamped = Math.max(0, Math.min(4, Math.round(n)));
  return clamped as AutonomyLevel;
}
