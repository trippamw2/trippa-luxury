// ─── Kivara Agent Evaluation (Master OS §24) ────────────────────────────────
// Measures every AI agent on: accuracy, completion rate, cost, speed, customer
// impact, revenue impact, error rate and escalation rate. Rules from the Master
// OS: "Do not assume an agent works simply because it produces impressive text."
// In-memory event log for MVP with an interface that permits later persistence.
// ─────────────────────────────────────────────────────────────────────────────

import { callLlmJson } from "./llm";

export type AgentEventType =
  | "success"
  | "error"
  | "escalation"
  | "llm_usage"
  | "customer_outcome"
  | "revenue_outcome";

export interface AgentEvent {
  id: string;
  agent: string;
  type: AgentEventType;
  occurredAt: string;
  meta?: {
    promptTokens?: number;
    completionTokens?: number;
    latencyMs?: number;
    revenue?: number;
  };
}

export interface AgentMetrics {
  agent: string;
  eventCount: number;
  successCount: number;
  errorCount: number;
  escalationCount: number;
  accuracy: number; // 0–100 (success / non-error share)
  completionRate: number; // 0–100
  cost: number; // estimated from token usage (USD)
  speedMs: number; // avg latency
  customerImpact: number; // customer-outcome events
  revenueImpact: number; // sum revenue from revenue-outcome events
  errorRate: number; // 0–100
  escalationRate: number; // 0–100
  totalTokens: number; // raw token usage across events
}

/** Optional LLM-written qualitative assessment for an agent. */
export interface AgentInsight {
  agent: string;
  metrics: AgentMetrics;
  insight: string;
}

const USD_PER_1K_PROMPT = 0.00015;
const USD_PER_1K_COMPLETION = 0.0006;

const events: AgentEvent[] = [];

function uid(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Pure: aggregate a list of events into per-agent metrics. Unit-testable.
 */
export function evaluateAgent(name: string, evts: AgentEvent[]): AgentMetrics | null {
  const mine = evts.filter((e) => e.agent === name);
  if (mine.length === 0) return null;

  const success = mine.filter((e) => e.type === "success").length;
  const errors = mine.filter((e) => e.type === "error").length;
  const escalations = mine.filter((e) => e.type === "escalation").length;
  const customerOutcomes = mine.filter((e) => e.type === "customer_outcome").length;

  const revenueImpact = mine
    .filter((e) => e.type === "revenue_outcome")
    .reduce((s, e) => s + (e.meta?.revenue || 0), 0);

  const totalTokens = mine.reduce(
    (s, e) => s + (e.meta?.promptTokens || 0) + (e.meta?.completionTokens || 0),
    0
  );
  const promptTokens = mine.reduce((s, e) => s + (e.meta?.promptTokens || 0), 0);
  const completionTokens = mine.reduce((s, e) => s + (e.meta?.completionTokens || 0), 0);
  const cost =
    promptTokens * USD_PER_1K_PROMPT +
    completionTokens * USD_PER_1K_COMPLETION;

  const latency = mine.filter((e) => e.meta?.latencyMs !== undefined);
  const speedMs = latency.length
    ? Math.round(latency.reduce((s, e) => s + (e.meta?.latencyMs || 0), 0) / latency.length)
    : 0;

  const total = mine.length;
  const accuracy = total ? Math.round(((total - errors) / total) * 1000) / 10 : 0;
  const completionRate = total ? Math.round((success / total) * 1000) / 10 : 0;
  const errorRate = total ? Math.round((errors / total) * 1000) / 10 : 0;
  const escalationRate = total ? Math.round((escalations / total) * 1000) / 10 : 0;

  return {
    agent: name,
    eventCount: total,
    successCount: success,
    errorCount: errors,
    escalationCount: escalations,
    accuracy,
    completionRate,
    cost: Math.round(cost * 1000) / 1000,
    speedMs,
    customerImpact: customerOutcomes,
    revenueImpact,
    errorRate,
    escalationRate,
    totalTokens,
  };
}

export class AgentEvaluation {
  recordEvent(input: Omit<AgentEvent, "id" | "occurredAt">): AgentEvent {
    const evt: AgentEvent = { ...input, id: uid(), occurredAt: new Date().toISOString() };
    events.push(evt);
    return evt;
  }

  listEvents(agent?: string): AgentEvent[] {
    if (!agent) return [...events];
    return events.filter((e) => e.agent === agent);
  }

  evaluateAll(): AgentMetrics[] {
    const names = Array.from(new Set(events.map((e) => e.agent)));
    const metrics = names
      .map((n) => evaluateAgent(n, events))
      .filter((m): m is AgentMetrics => m !== null);
    metrics.sort((a, b) => b.eventCount - a.eventCount);
    return metrics;
  }

  evaluate(agent: string): AgentMetrics | null {
    return evaluateAgent(agent, events);
  }

  /**
   * Quantitative metrics plus an optional LLM-written qualitative insight for a
   * named agent. Deterministic metrics always present; insight may be absent.
   */
  async evaluateWithInsight(agent: string): Promise<AgentInsight | null> {
    const metrics = evaluateAgent(agent, events);
    if (!metrics) return null;

    let insight = "";
    try {
      const { data } = await callLlmJson<{ insight: string }>(
        [
          {
            role: "system",
            content:
              "You are Kivara's operations analyst for an ultra-luxury Zambian travel house. " +
              "Write a concise, actionable insight (max 45 words) about an AI agent's performance. " +
              "Reference the metrics provided, identify one strength, one risk, and one suggested action. " +
              "Use warm, precise, understated-luxury language. Never invent numbers outside those provided.",
          },
          {
            role: "user",
            content: [
              `Agent: ${agent}`,
              `Events: ${metrics.eventCount} | Accuracy: ${metrics.accuracy}% | Completion: ${metrics.completionRate}%`,
              `Error rate: ${metrics.errorRate}% | Escalation: ${metrics.escalationRate}%`,
              `Cost: $${metrics.cost} | Avg latency: ${metrics.speedMs}ms | Tokens: ${metrics.totalTokens}`,
              `Revenue impact: $${metrics.revenueImpact} | Customer impact: ${metrics.customerImpact}`,
            ].join("\n"),
          },
        ],
        { temperature: 0.3, maxTokens: 180 }
      );
      if (data.insight?.trim()) insight = data.insight.trim();
    } catch (err: unknown) {
      console.warn("Agent evaluation insight LLM unavailable:", err instanceof Error ? err.message : String(err));
    }

    return { agent, metrics, insight };
  }
}

export const agentEvaluation = new AgentEvaluation();
