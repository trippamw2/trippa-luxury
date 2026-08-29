import { describe, it, expect } from "vitest";
import { evaluateAgent } from "@/lib/ai/agent-evaluation";
import type { AgentEvent } from "@/lib/ai/agent-evaluation";

describe("agent-evaluation pure", () => {
  it("returns null for no events", () => {
    expect(evaluateAgent("test-agent", [])).toBeNull();
  });
  it("computes accuracy and rates", () => {
    const evts: AgentEvent[] = [
      { id: "1", agent: "a", type: "success", occurredAt: new Date().toISOString() },
      { id: "2", agent: "a", type: "success", occurredAt: new Date().toISOString() },
      { id: "3", agent: "a", type: "error", occurredAt: new Date().toISOString() },
      { id: "4", agent: "a", type: "escalation", occurredAt: new Date().toISOString() },
    ];
    const m = evaluateAgent("a", evts)!;
    expect(m.eventCount).toBe(4);
    expect(m.successCount).toBe(2);
    expect(m.errorCount).toBe(1);
    expect(m.escalationCount).toBe(1);
    expect(m.accuracy).toBeGreaterThan(0);
  });
  it("ignores other agents", () => {
    const evts: AgentEvent[] = [{ id: "1", agent: "b", type: "success", occurredAt: new Date().toISOString() }];
    expect(evaluateAgent("a", evts)).toBeNull();
  });
});
