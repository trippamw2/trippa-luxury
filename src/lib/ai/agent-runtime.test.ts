import { describe, expect, it } from "vitest";
import { KIVARA_AGENTS } from "@/lib/ai/agent-registry";
import { AGENT_RUNTIME, agentRuntimeCensus } from "@/lib/ai/agent-runtime";
import { ANALYTICAL_AGENTS } from "@/lib/ai/agents";

const NAMES = KIVARA_AGENTS.map((a) => a.name);
const ALL_STATUSES = ["executable", "analytical", "orchestration-label", "declared"] as const;

describe("agent runtime status", () => {
  it("classifies every catalogued agent", () => {
    const missing = NAMES.filter((n) => !AGENT_RUNTIME[n]);
    expect(missing).toEqual([]);
  });

  it("has no status for an agent that is not in the catalogue", () => {
    const extra = Object.keys(AGENT_RUNTIME).filter((n) => !NAMES.includes(n));
    expect(extra).toEqual([]);
  });

  it("carries evidence for every classification", () => {
    for (const [name, entry] of Object.entries(AGENT_RUNTIME)) {
      expect(entry.evidence, `${name} needs evidence`).toBeTruthy();
      expect(ALL_STATUSES, `${name} has an unknown status`).toContain(entry.status);
    }
  });

  it("counts the fleet honestly", () => {
    const census = agentRuntimeCensus(NAMES);
    expect(census.total).toBe(NAMES.length);
    expect(
      census.executable + census.analytical + census.orchestrationLabel + census.declared
    ).toBe(census.total);
    // canAct is the only number that may be quoted as autonomy. It must stay
    // strictly below the catalogue: 31 of 37 agents are implemented but
    // recommend-only, and a platform where that stopped being true would be a
    // deliberate change to revisit, not a refactor.
    expect(census.canAct).toBe(census.executable);
    expect(census.canAct).toBeLessThan(census.total);
    expect(census.canOnlyAdvise).toBe(census.analytical);
  });

  it("has no agent left declared", () => {
    const census = agentRuntimeCensus(NAMES);
    expect(census.declared).toBe(0);
    expect(census.fullyImplemented).toBe(true);
  });
});

describe("analytical layer", () => {
  it("implements exactly the agents marked analytical", () => {
    const markedAnalytical = Object.entries(AGENT_RUNTIME)
      .filter(([, entry]) => entry.status === "analytical")
      .map(([name]) => name)
      .sort();
    const implemented = Object.keys(ANALYTICAL_AGENTS).sort();

    // Either side drifting is the defect this layer exists to prevent: an agent
    // advertised as analytical but with no core, or a core with no honest status.
    expect(implemented).toEqual(markedAnalytical);
  });

  it("never marks an analytical agent as executable", () => {
    // If an agent that may only recommend is ever promoted to executable, that
    // promotion must be a conscious decision made here, not a side effect.
    const implemented = Object.keys(ANALYTICAL_AGENTS);
    const wronglyPromoted = implemented.filter(
      (n) => AGENT_RUNTIME[n]?.status === "executable"
    );
    expect(wronglyPromoted).toEqual([]);
  });
});
