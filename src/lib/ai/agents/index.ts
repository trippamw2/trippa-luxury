// Uniform runner for the analytical agent layer.
//
// This is the single place that binds the 22 agent names in AGENT_RUNTIME to the
// functions that implement them, so:
//
//   1. An agent cannot be listed as `analytical` here without a real core. The
//      agent-runtime.test.ts cross-check fails if either side drifts.
//   2. One route can run any agent by name, and an unknown name is a loud error
//      rather than a silent empty result.
//
// Every core is PURE (snapshot in, report out), so this runner is the only place
// that touches the database, and every agent is testable with a hand-built
// snapshot and no Supabase connection at all.

import { readPlatformSnapshot, applyReadFailures, type AgentReport, type PlatformSnapshot } from "@/lib/ai/capabilities/data";
import { STRATEGY_AGENTS } from "./strategy";
import { MARKETING_AGENTS } from "./marketing";
import { OPERATIONS_AGENTS } from "./operations";
import { ROMANCE_AGENTS } from "./romance";

export type AnalyticalAgentName = keyof typeof ANALYTICAL_AGENTS;

type AgentCore = (snapshot: PlatformSnapshot) => AgentReport<unknown>;

/**
 * All 22 analytical agents, by registry name.
 *
 * Keys are checked against AGENT_RUNTIME by agent-runtime.test.ts, which also
 * fails if a name here is missing from that map or vice versa. A name that
 * appears in the registry but not here is the exact defect this layer was built
 * to eliminate.
 */
export const ANALYTICAL_AGENTS = {
  // Strategy & Intelligence (Master OS Â§5A)
  strategist: STRATEGY_AGENTS.strategist,
  "market-research": STRATEGY_AGENTS["market-research"],
  "competitor-intelligence": STRATEGY_AGENTS["competitor-intelligence"],
  "opportunity-detection": STRATEGY_AGENTS["opportunity-detection"],
  "scenario-planning": STRATEGY_AGENTS["scenario-planning"],

  // Romance Intelligence (Master OS Â§6)
  "romance-agent": ROMANCE_AGENTS["romance-agent"],
  "relationship-agent": ROMANCE_AGENTS["relationship-agent"],

  // Operations (Master OS Â§8)
  "supplier-agent": OPERATIONS_AGENTS["supplier-agent"],
  "booking-coordinator": OPERATIONS_AGENTS["booking-coordinator"],
  "transfer-agent": OPERATIONS_AGENTS["transfer-agent"],
  "accommodation-agent": OPERATIONS_AGENTS["accommodation-agent"],
  "safari-ops": OPERATIONS_AGENTS["safari-ops"],
  "activity-coordinator": OPERATIONS_AGENTS["activity-coordinator"],
  "guest-experience": OPERATIONS_AGENTS["guest-experience"],
  "travel-docs": OPERATIONS_AGENTS["travel-docs"],
  "itinerary-verification": OPERATIONS_AGENTS["itinerary-verification"],
  "emergency-coordinator": OPERATIONS_AGENTS["emergency-coordinator"],

  // Marketing (Master OS Â§15)
  "brand-strategist": MARKETING_AGENTS["brand-strategist"],
  "content-agent": MARKETING_AGENTS["content-agent"],
  "storytelling-agent": MARKETING_AGENTS["storytelling-agent"],
  "campaign-agent": MARKETING_AGENTS["campaign-agent"],
  "analytics-agent": MARKETING_AGENTS["analytics-agent"],
} as const satisfies Record<string, AgentCore>;

export function isAnalyticalAgent(name: string): name is AnalyticalAgentName {
  return Object.prototype.hasOwnProperty.call(ANALYTICAL_AGENTS, name);
}

export function analyticalAgentNames(): AnalyticalAgentName[] {
  return Object.keys(ANALYTICAL_AGENTS) as AnalyticalAgentName[];
}

/**
 * Run one agent against a given snapshot. Pure - no database access.
 *
 * The returned report is reconciled against `snapshot.readFailures`, so a core
 * that names a table it never successfully read cannot reach the caller.
 */
export function runAnalyticalAgent(
  name: AnalyticalAgentName,
  snapshot: PlatformSnapshot
): AgentReport<unknown> {
  return applyReadFailures(ANALYTICAL_AGENTS[name](snapshot), snapshot.readFailures);
}

/** Run every agent in the layer against one snapshot. */
export function runAllAnalyticalAgents(
  snapshot: PlatformSnapshot
): Record<AnalyticalAgentName, AgentReport<unknown>> {
  const out = {} as Record<AnalyticalAgentName, AgentReport<unknown>>;
  for (const name of analyticalAgentNames()) {
    out[name] = applyReadFailures(ANALYTICAL_AGENTS[name](snapshot), snapshot.readFailures);
  }
  return out;
}

/**
 * Read a fresh snapshot and run the requested agents.
 *
 * This is the only function in the layer that hits Postgres. `names` defaults to
 * every agent, which is the right default for a founder-facing briefing page and
 * the wrong default for anything called in a loop, so it is explicit about what
 * it cost: one snapshot read serves all 22 agents rather than 22 separate reads.
 */
export async function runAnalyticalAgents(
  names?: readonly AnalyticalAgentName[]
): Promise<Record<string, AgentReport<unknown>>> {
  const snapshot = await readPlatformSnapshot();
  const selected = names ?? analyticalAgentNames();
  const out: Record<string, AgentReport<unknown>> = {};
  for (const name of selected) {
    out[name] = applyReadFailures(ANALYTICAL_AGENTS[name](snapshot), snapshot.readFailures);
  }
  return out;
}
