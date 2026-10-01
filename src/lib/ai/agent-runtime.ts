// Runtime status for every agent in the KIVARA_AGENTS catalogue.
//
// WHY THIS FILE EXISTS
// The registry (agent-registry.ts) holds 37 AgentSpec entries. That number is a
// *governance* count - it records the authority, scope and escalation path the
// company has agreed for each named role. It is NOT a count of running code.
// Reading the registry alone makes a 2-module system look like a 37-agent fleet,
// which is exactly the kind of claim that collapses the first time someone asks
// "show me where romance-agent actually runs".
//
// So every catalogue entry is classified here against evidence, and
// agent-runtime.test.ts fails if an entry is added to the registry without a
// matching status. The gap is therefore structural, not a matter of tone.
//
// The four statuses, in descending order of what they can actually do:
//
//   executable        A dedicated module is invoked on a live request path and
//                     can take consequential action. Calling it does real work
//                     and persists it. 9 of the catalogue.
//   analytical        A dedicated module is invoked on a live request path and
//                     returns a real, data-derived report - but by its own
//                     registry permissions it may only recommend. 22 of the
//                     catalogue.
//   orchestration-label
//                     The name is a real member of the concierge state machine -
//                     it appears in the AgentName union or on a workflow edge and
//                     is what getNextAgent() returns for a state. Nothing calls
//                     a "reminder-agent"; the label routes a state transition
//                     that workflow-engine already performs inline. 6.
//   declared          Governance catalogue only. No code outside the registry
//                     even names it. 0 as of the analytical layer landing.
//
// WHY `analytical` IS SEPARATE FROM `executable` ──────────────────────────────────
// Implementing the 22 previously-declared agents made "37 agents" true in a
// literal sense, and true in exactly the way that was previously a lie: 37
// modules, none of which can do anything. Collapsing them into `executable`
// would let a reader count 37 as 37 actors, which is the same overclaim this
// file was created to stop. So the census reports the split explicitly, and
// `canAct` is the number that may be quoted as autonomy.

export type AgentRuntimeStatus =
  | "executable"
  | "analytical"
  | "orchestration-label"
  | "declared";

export interface AgentRuntimeEntry {
  status: AgentRuntimeStatus;
  /** Where the executable path lives, or why there isn't one. */
  evidence: string;
}

export const AGENT_RUNTIME: Record<string, AgentRuntimeEntry> = {
  // ---- executable: real module, real live caller -----------------------------
  "chief-of-staff": {
    status: "executable",
    evidence: "src/lib/ai/chief-of-staff.ts via POST /api/admin/chief-of-staff/daily-briefing and /weekly-review",
  },
  profiler: {
    status: "executable",
    evidence: "src/lib/ai/guest-profiler.ts llmProfile(), called by AIOrchestrator.processInquiry and POST /api/ai/prospect, /api/inquiry",
  },
  curator: {
    status: "executable",
    evidence: "src/lib/ai/journey-engine.ts, called by AIOrchestrator.processInquiry step 2",
  },
  "quote-specialist": {
    status: "executable",
    evidence: "quote generation step of AIOrchestrator.processInquiry; QC decision recorded by src/lib/ai/quality-gate.ts from POST /api/ai/send-quote",
  },
  "quality-control": {
    status: "executable",
    evidence: "src/lib/ai/quality-gate.ts recordQcDecision(), called from POST /api/ai/send-quote",
  },
  "finance-economics": {
    status: "executable",
    evidence: "src/lib/ai/finance-economics.ts via /api/admin/finance-intelligence",
  },
  "partnership-agent": {
    status: "executable",
    evidence: "src/lib/ai/partnership-agent.ts, exercised by /api/admin/partnerships",
  },
  "ai-lab": {
    status: "executable",
    evidence: "src/lib/ai/ai-lab.ts via /api/admin/ai-lab",
  },
  analyst: {
    status: "executable",
    evidence: "src/lib/ai/agent-evaluation.ts via POST /api/admin/agent-evaluation",
  },

  // ---- orchestration-label: named by the state machine, nothing calls them ----
  receptionist: {
    status: "orchestration-label",
    evidence: "AgentName union member and the 'new' -> label mapping in getNextAgent(); no receptionist module exists",
  },
  "payment-agent": {
    status: "orchestration-label",
    evidence: "AgentName member and the label on workflow-engine booking-state edges (L84-L85); transitions are performed inline by workflow-engine",
  },
  "itinerary-agent": {
    status: "orchestration-label",
    evidence: "AgentName union member only; no itinerary-agent module",
  },
  "reminder-agent": {
    status: "orchestration-label",
    evidence: "AgentName member and the label on the 'itinerary-sent' workflow edge (L87); reminders are sent by POST /api/ai/trigger-reminders, not by an agent of this name",
  },
  "followup-agent": {
    status: "orchestration-label",
    evidence: "AgentName union member only; no followup-agent module",
  },
  "distribution-agent": {
    status: "orchestration-label",
    evidence: "Referenced by orchestrator.ts but never dispatched; distribution capability lives in src/lib/ai/distribution-engine.ts under a different identity",
  },

  // ---- analytical: real module, real live caller, recommend-only by design ----
  // Every entry below is implemented in src/lib/ai/agents/*.ts as a PURE function
  // over a PlatformSnapshot, registered in ANALYTICAL_AGENTS, and invoked from
  // POST /api/admin/agent-briefing. All 22 return a real data-derived report and
  // none of them can take consequential action, which is what their registry
  // `permissions` grant them.

  // Strategy & Intelligence (Master OS §5A)
  strategist: {
    status: "analytical",
    evidence: "src/lib/ai/agents/strategy.ts runStrategist(); read-only objectives from inquiries/bookings/journeys/suppliers",
  },
  "market-research": {
    status: "analytical",
    evidence: "src/lib/ai/agents/strategy.ts runMarketResearch(); destination demand vs catalogue, with external trend data named as unavailable",
  },
  "competitor-intelligence": {
    status: "analytical",
    evidence: "src/lib/ai/agents/strategy.ts runCompetitorIntelligence(); reports it has no competitor data rather than estimating one",
  },
  "opportunity-detection": {
    status: "analytical",
    evidence: "src/lib/ai/agents/strategy.ts runOpportunityDetection(); opportunities and threats derived from supplier compliance, VIP guests and inquiry status",
  },
  "scenario-planning": {
    status: "analytical",
    evidence: "src/lib/ai/agents/strategy.ts runScenarioPlanning(); base/upside/downside multipliers over real booking counts, flagged indicativeOnly under 5 bookings",
  },

  // Romance Intelligence (Master OS §6)
  "romance-agent": {
    status: "analytical",
    evidence: "src/lib/ai/agents/romance.ts runRomanceAgent() + buildEmotionalProfile(); Emotion->Memory arc built from recorded guest_profiles fields, each stage marked inferred when unsupported",
  },
  "relationship-agent": {
    status: "analytical",
    evidence: "src/lib/ai/agents/romance.ts runRelationshipAgent() + assessRelationship(); risk from recorded contact history, outreachPermittedByThisAgent always false",
  },

  // Operations (Master OS §8)
  "supplier-agent": {
    status: "analytical",
    evidence: "src/lib/ai/agents/operations.ts runSupplierAgent(); ranks by compliance then rating, never by commission_rate",
  },
  "booking-coordinator": {
    status: "analytical",
    evidence: "src/lib/ai/agents/operations.ts runBookingCoordinator(); per-journey gap list from itinerary_items and supplier register",
  },
  "transfer-agent": {
    status: "analytical",
    evidence: "src/lib/ai/agents/operations.ts runTransferAgent(); reports every journey unverifiable because no arrival or pickup data is recorded",
  },
  "accommodation-agent": {
    status: "analytical",
    evidence: "src/lib/ai/agents/operations.ts runAccommodationAgent(); sellable inventory per destination, names missing rate/availability data",
  },
  "safari-ops": {
    status: "analytical",
    evidence: "src/lib/ai/agents/operations.ts runSafariOps(); safety escalation when the operator lacks compliance paperwork, regardless of confirmation",
  },
  "activity-coordinator": {
    status: "analytical",
    evidence: "src/lib/ai/agents/operations.ts runActivityCoordinator(); detects same-day same-time clashes from itinerary_items.start_time",
  },
  "guest-experience": {
    status: "analytical",
    evidence: "src/lib/ai/agents/operations.ts runGuestExperience(); unanswered inquiries, VIPs with no contact, unevidenced occasions",
  },
  "travel-docs": {
    status: "analytical",
    evidence: "src/lib/ai/agents/operations.ts runTravelDocs(); passport/visa/insurance/vaccination reported unverifiable, which documents Kivara can generate",
  },
  "itinerary-verification": {
    status: "analytical",
    evidence: "src/lib/ai/agents/operations.ts runItineraryVerification(); blocker checks for orphan/blacklisted/non-compliant suppliers and time inversions, unverifiable when unprovable",
  },
  "emergency-coordinator": {
    status: "analytical",
    evidence: "src/lib/ai/agents/operations.ts runEmergencyCoordinator(); compliance readiness prompt, callableCount always 0 because no contacts are testable",
  },

  // Marketing (Master OS §15)
  "brand-strategist": {
    status: "analytical",
    evidence: "src/lib/ai/agents/marketing.ts runBrandStrategist(); guardrails plus off-brand term scan over active tour titles",
  },
  "content-agent": {
    status: "analytical",
    evidence: "src/lib/ai/agents/marketing.ts runContentAgent(); demand-ranked subjects from inquiries/tours/guest_profiles, publishRequiresApproval always true",
  },
  "storytelling-agent": {
    status: "analytical",
    evidence: "src/lib/ai/agents/marketing.ts runStorytellingAgent(); emotion arcs keyed to recorded special_occasion values",
  },
  "campaign-agent": {
    status: "analytical",
    evidence: "src/lib/ai/agents/marketing.ts runCampaignAgent(); ranks recorded inquiry sources, projectedRoi hard-typed null because no spend data exists",
  },
  "analytics-agent": {
    status: "analytical",
    evidence: "src/lib/ai/agents/marketing.ts runAnalyticsAgent(); per-source volume and attributed conversion from inquiries.source joined via bookings.inquiry_id",
  },
};

export interface AgentRuntimeCensus {
  total: number;
  executable: number;
  analytical: number;
  orchestrationLabel: number;
  declared: number;
  /**
   * The only number that may be quoted as autonomy: agents with a module on a
   * live path that can take consequential action. `total - canAct` is agents
   * that exist as code but may only recommend, and the difference matters
   * enormously in a sales conversation.
   */
  canAct: number;
  /** Agents with a real module that may only recommend. */
  canOnlyAdvise: number;
  /** Catalogued agents with no executable module, by name. */
  notExecutable: string[];
  /**
   * True when every catalogued agent is backed by a real module. Worth exposing
   * rather than asserting, so a future claim can be checked against this.
   */
  fullyImplemented: boolean;
}

/**
 * Summarise what the registry actually contains right now.
 *
 * Use this instead of quoting KIVARA_AGENTS.length as a headcount of running
 * systems. `total` is the governance catalogue. `canAct` is the number of
 * catalogued agents that can actually do something. `canOnlyAdvise` counts
 * agents that are genuinely implemented but restricted to recommending - quoting
 * those as if they were actors overstates the organisation's autonomy.
 */
export function agentRuntimeCensus(catalogueNames: readonly string[]): AgentRuntimeCensus {
  const statusOf = (name: string): AgentRuntimeStatus | undefined => AGENT_RUNTIME[name]?.status;
  const count = (status: AgentRuntimeStatus): number =>
    catalogueNames.filter((name) => statusOf(name) === status).length;

  const executable = count("executable");
  const analytical = count("analytical");
  const declared = count("declared");

  return {
    total: catalogueNames.length,
    executable,
    analytical,
    orchestrationLabel: count("orchestration-label"),
    declared,
    canAct: executable,
    canOnlyAdvise: analytical,
    notExecutable: catalogueNames.filter((name) => statusOf(name) !== "executable"),
    fullyImplemented: declared === 0,
  };
}
