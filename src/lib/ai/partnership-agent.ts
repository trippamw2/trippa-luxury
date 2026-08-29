// ─── Kivara Partnership Agent (Master OS §16 — Partnership Agent) ─────────────
// Identifies and scores potential partners / affiliates (hotels, DMCs, luxury
// brands, event planners) for fit with Kivara's romance positioning. This is the
// outward-facing complement to Supplier Intelligence (inward supply vetting).
// Rule-based fit scoring + optional LLM rationale. Never throws on LLM failure.
// ─────────────────────────────────────────────────────────────────────────────

import { callLlmJson } from "./llm";
import { getBrandKnowledge } from "./knowledge";

export type PartnerType =
  | "hotel"
  | "dmc"
  | "luxury-brand"
  | "event-planner"
  | "travel-advisor"
  | "airline"
  | "other";

export interface PartnerCandidate {
  name: string;
  type: PartnerType;
  country?: string;
  city?: string;
  tags?: string[];
  reach?: number; // audience size / following
  commissionWilling?: number; // 0..1
}

export interface PartnerScore {
  candidate: PartnerCandidate;
  fit: number; // 0..100
  tier: "strategic" | "tactical" | "exploratory";
  strengths: string[];
  risks: string[];
  rationale?: string;
}

const TYPE_FIT: Record<PartnerType, number> = {
  hotel: 90,
  dmc: 75,
  "luxury-brand": 70,
  "event-planner": 65,
  "travel-advisor": 60,
  airline: 55,
  other: 40,
};

/**
 * Pure: score a partner candidate for fit (0..100). Unit-testable.
 */
export function scorePartner(candidate: PartnerCandidate): Omit<PartnerScore, "rationale"> {
  let fit = TYPE_FIT[candidate.type] ?? 40;

  const strengths: string[] = [];
  const risks: string[] = [];

  if (candidate.country) {
    strengths.push(`${candidate.country} presence aligned with romance destinations.`);
    fit += 5;
  }
  if (candidate.city) {
    strengths.push(`Local presence in ${candidate.city}.`);
    fit += 3;
  }

  const romanticTags = ["romance", "honeymoon", "luxury", "boutique", "spa", "villa", "safari", "beach"];
  const tags = candidate.tags || [];
  const romanceHits = tags.filter((t) => romanticTags.includes(t.toLowerCase()));
  if (romanceHits.length > 0) {
    strengths.push(`Romance-aligned positioning (${romanceHits.join(", ")}).`);
    fit += romanceHits.length * 6;
  }

  if (candidate.reach !== undefined) {
    if (candidate.reach >= 50000) {
      strengths.push("Significant reach that amplifies Kivara's visibility.");
      fit += 8;
    } else if (candidate.reach >= 10000) {
      strengths.push("Meaningful niche reach.");
      fit += 4;
    }
  }

  if (candidate.commissionWilling !== undefined) {
    if (candidate.commissionWilling >= 0.15) {
      strengths.push("Flexible commissioned arrangement.");
      fit += 6;
    } else if (candidate.commissionWilling <= 0.05) {
      risks.push("Low commission appetite may limit margin.");
      fit -= 4;
    }
  }

  fit = Math.max(0, Math.min(100, Math.round(fit)));

  const tier = fit >= 80 ? "strategic" : fit >= 60 ? "tactical" : "exploratory";
  return { candidate, fit, tier, strengths, risks };
}

export class PartnershipAgent {
  /**
   * Score one or more candidates. Uses the LLM to add a rationale when
   * available; deterministic scoring otherwise. Never throws.
   */
  async evaluate(candidates: PartnerCandidate[]): Promise<PartnerScore[]> {
    const scores: PartnerScore[] = candidates.map((c) => ({
      ...scorePartner(c),
    }));

    try {
      const brand = getBrandKnowledge();
      const res = await callLlmJson<{ rationale: string }>([
        {
          role: "system",
          content: `You are Kivara's Partnership agent.${brand?.tagline ? ` Brand: ${brand.tagline}.` : ""} Assess strategic fit concisely (2-3 sentences). Output STRICT JSON: {rationale}.`,
        },
        {
          role: "user",
          content: `Candidates: ${JSON.stringify(scores.map((s) => ({ name: s.candidate.name, type: s.candidate.type, fit: s.fit, strengths: s.strengths, risks: s.risks }))).slice(0, 1500)}. Emit JSON.`,
        },
      ]);
      if (res.data?.rationale) {
        // Apply the single rationale to the highest-fit candidate.
        const top = [...scores].sort((a, b) => b.fit - a.fit)[0];
        if (top) top.rationale = res.data.rationale;
      }
    } catch {
      // deterministic scoring already present
    }

    return scores.sort((a, b) => b.fit - a.fit);
  }
}

export const partnershipAgent = new PartnershipAgent();
