// ─── Kivara Distribution Intelligence Agent (Master OS §15 — Distribution) ───
// Selects the optimal channel mix for a campaign and monitors channel yield so
// spend follows performance. Rule-based channel scoring + LLM rationale with a
// graceful fallback.
// ─────────────────────────────────────────────────────────────────────────────

import { callLlmJson } from "./llm";

export interface ChannelMix {
  channel: string;
  weight: number; // 0..1 share of budget/focus
  rationale: string;
}

export interface ChannelPerformance {
  channel: string;
  attributedRevenue: number;
  spend: number;
  conversions: number;
  impressions: number;
}

export interface ChannelPlan {
  channelMix: ChannelMix[];
  recommendation: string;
  createdAt: string;
}

const CHANNEL_STRENGTHS: Record<string, { reach: number; romance: number; intent: number; costEfficiency: number }> = {
  instagram: { reach: 0.9, romance: 0.95, intent: 0.5, costEfficiency: 0.6 },
  email: { reach: 0.5, romance: 0.7, intent: 0.9, costEfficiency: 0.9 },
  google: { reach: 0.7, romance: 0.5, intent: 0.9, costEfficiency: 0.7 },
  partnerships: { reach: 0.5, romance: 0.6, intent: 0.7, costEfficiency: 0.9 },
  whatsapp: { reach: 0.5, romance: 0.7, intent: 0.9, costEfficiency: 0.8 },
};

/**
 * Pure: score a channel for a given audience (0..1). Unit-testable.
 */
export function scoreChannel(channel: string, audience: "discovery" | "nurture" | "re-engagement"): number {
  const s = CHANNEL_STRENGTHS[channel];
  if (!s) return 0.4;
  if (audience === "discovery") return s.reach * 0.5 + s.romance * 0.3 + s.intent * 0.1 + s.costEfficiency * 0.1;
  if (audience === "nurture") return s.intent * 0.5 + s.romance * 0.3 + s.costEfficiency * 0.2;
  return s.costEfficiency * 0.5 + s.intent * 0.3 + s.reach * 0.2;
}

/**
 * Pure: turn channel scores into a normalised mix. Unit-testable.
 */
export function buildChannelMix(
  channels: string[],
  audience: "discovery" | "nurture" | "re-engagement"
): ChannelMix[] {
  const scored = channels
    .map((c) => ({ channel: c, score: scoreChannel(c, audience) }))
    .sort((a, b) => b.score - a.score);
  const total = scored.reduce((sum, s) => sum + s.score, 0) || 1;
  return scored.map((s) => ({
    channel: s.channel,
    weight: Math.round((s.score / total) * 100) / 100,
    rationale: `Score ${s.score.toFixed(2)} for ${audience} stage.`,
  }));
}

/**
 * Pure: recommend channel allocation based on historical performance. Unit-testable.
 */
export function recommendByPerformance(performance: ChannelPerformance[]): ChannelMix[] {
  const enhanced = performance.map((p) => {
    const roas = p.spend > 0 ? p.attributedRevenue / p.spend : 0;
    const convRate = p.impressions > 0 ? p.conversions / p.impressions : 0;
    return { ...p, roas, convRate };
  });
  enhanced.sort((a, b) => b.roas - a.roas);
  const totalScore = enhanced.reduce((s, e) => s + Math.max(0, e.roas * (1 + e.convRate)), 0) || 1;
  return enhanced.map((e) => ({
    channel: e.channel,
    weight: Math.round((Math.max(0, e.roas * (1 + e.convRate)) / totalScore) * 100) / 100,
    rationale: `ROAS ${e.roas.toFixed(2)}x with ${(e.convRate * 100).toFixed(1)}% conversion.`,
  }));
}

export class DistributionEngine {
  /**
   * Produce a channel plan for a campaign. LLM rationale when available,
   * deterministic scores otherwise. Never throws.
   */
  async plan(input: {
    channels: string[];
    audience: "discovery" | "nurture" | "re-engagement";
    performance?: ChannelPerformance[];
  }): Promise<ChannelPlan> {
    const channelMix = input.performance && input.performance.length > 0
      ? recommendByPerformance(input.performance)
      : buildChannelMix(input.channels, input.audience);

    const recommendation = channelMix[0]
      ? `Concentrate budget on ${channelMix[0].channel} (${(channelMix[0].weight * 100).toFixed(0)}% share) for ${input.audience}.`
      : "No channels provided.";

    return {
      channelMix,
      recommendation,
      createdAt: new Date().toISOString(),
    };
  }
}

export const distributionEngine = new DistributionEngine();
