import { describe, expect, it } from "vitest";
import { KIVARA_AGENTS } from "@/lib/ai/agent-registry";
import { AGENT_RUNTIME, agentRuntimeCensus } from "@/lib/ai/agent-runtime";

const NAMES = KIVARA_AGENTS.map((a) => a.name);

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
      expect(["executable", "orchestration-label", "declared"]).toContain(entry.status);
    }
  });

  it("counts the fleet honestly", () => {
    const census = agentRuntimeCensus(NAMES);
    expect(census.total).toBe(NAMES.length);
    expect(census.executable + census.orchestrationLabel + census.declared).toBe(census.total);
    // The point of this module: the registry is a governance catalogue and is
    // NOT a headcount of running systems. If a future change ever makes all 37
    // executable, this assertion should be revisited deliberately rather than
    // quietly drifting - that is a real platform milestone, not a refactor.
    expect(census.executable).toBeLessThan(census.total);
  });
});
