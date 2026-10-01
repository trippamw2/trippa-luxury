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
// The three statuses, in descending order of what they can actually do:
//
//   executable        A dedicated module is invoked on a live request path.
//                     Calling the module does real work and persists/returns it.
//   orchestration-label
//                     The name is a real member of the concierge state machine -
//                     it appears in the AgentName union or on a workflow edge and
//                     is what getNextAgent() returns for a state. Nothing calls
//                     a "reminder-agent"; the label routes a state transition
//                     that workflow-engine already performs inline.
//   declared          Governance catalogue only. No code outside the registry
//                     even names it. It documents an intended role, not a system.

export type AgentRuntimeStatus = "executable" | "orchestration-label" | "declared";

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

  // ---- declared: governance catalogue only -----------------------------------
  strategist: {
    status: "declared",
    evidence: "Named in src/lib/ai/ai-lab.ts as strategy input only; no strategist execution path",
  },
  "booking-coordinator": {
    status: "declared",
    evidence: "Named in src/lib/ai/ai-lab.ts only; no booking-coordinator module",
  },
  "market-research": { status: "declared", evidence: "No code outside the registry references this name" },
  "competitor-intelligence": { status: "declared", evidence: "No code outside the registry references this name" },
  "opportunity-detection": { status: "declared", evidence: "No code outside the registry references this name" },
  "scenario-planning": { status: "declared", evidence: "No code outside the registry references this name" },
  "romance-agent": { status: "declared", evidence: "No code outside the registry references this name" },
  "relationship-agent": { status: "declared", evidence: "No code outside the registry references this name" },
  "supplier-agent": { status: "declared", evidence: "No code outside the registry references this name" },
  "transfer-agent": { status: "declared", evidence: "No code outside the registry references this name" },
  "accommodation-agent": { status: "declared", evidence: "No code outside the registry references this name" },
  "safari-ops": { status: "declared", evidence: "No code outside the registry references this name" },
  "activity-coordinator": { status: "declared", evidence: "No code outside the registry references this name" },
  "guest-experience": { status: "declared", evidence: "No code outside the registry references this name" },
  "travel-docs": {
    status: "declared",
    evidence: "No code outside the registry references this name; document generation exists but is not driven by this agent",
  },
  "itinerary-verification": { status: "declared", evidence: "No code outside the registry references this name" },
  "emergency-coordinator": { status: "declared", evidence: "No code outside the registry references this name" },
  "brand-strategist": { status: "declared", evidence: "No code outside the registry references this name" },
  "content-agent": { status: "declared", evidence: "No code outside the registry references this name" },
  "storytelling-agent": { status: "declared", evidence: "No code outside the registry references this name" },
  "campaign-agent": { status: "declared", evidence: "No code outside the registry references this name" },
  "analytics-agent": {
    status: "declared",
    evidence: "No code outside the registry references this name; generateAnalytics() on the orchestrator is not this agent",
  },
};

export interface AgentRuntimeCensus {
  total: number;
  executable: number;
  orchestrationLabel: number;
  declared: number;
  /** Catalogued agents with no executable module, by name. */
  notExecutable: string[];
}

/**
 * Summarise what the registry actually contains right now.
 *
 * Use this instead of quoting KIVARA_AGENTS.length as if it were a headcount of
 * running systems. `total` is the governance catalogue; `executable` is the
 * number of named agents that a request can actually invoke.
 */
export function agentRuntimeCensus(catalogueNames: readonly string[]): AgentRuntimeCensus {
  const notExecutable = catalogueNames.filter(
    (name) => AGENT_RUNTIME[name]?.status !== "executable"
  );
  return {
    total: catalogueNames.length,
    executable: catalogueNames.filter((n) => AGENT_RUNTIME[n]?.status === "executable").length,
    orchestrationLabel: catalogueNames.filter((n) => AGENT_RUNTIME[n]?.status === "orchestration-label").length,
    declared: catalogueNames.filter((n) => AGENT_RUNTIME[n]?.status === "declared").length,
    notExecutable,
  };
}
