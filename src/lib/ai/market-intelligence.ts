// ─── Kivara Market Intelligence Agent (Master OS §5A — Market Intelligence) ──
// Tracks destination demand, pricing trends, seasonality and emerging romantic
// destinations. Converts the platform's own inquiry + booking signals into
// market opportunities and scenario plans, so strategy and marketing are
// grounded in real demand rather than intuition.
// Rule-based analytics + optional LLM narrative. Never throws on LLM failure.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";
import { callLlmJson } from "./llm";

export interface MarketSignal {
  destination: string;
  inquiries: number;
  bookings: number;
  conversionRate: number; // bookings / inquiries
  avgBudget: number | null;
  avgBookingValue: number | null;
}

export interface Opportunity {
  destination: string;
  signal: "high-demand" | "rising" | "underserved" | "premium-gap";
  conviction: number; // 0..1
  rationale: string;
}

export interface MarketReport {
  generatedAt: string;
  signals: MarketSignal[];
  topDestinations: MarketSignal[];
  opportunities: Opportunity[];
  narrative?: string;
}

export interface ScenarioPlan {
  scenario: string;
  label: string;
  description: string;
  recommendations: string[];
  confidence: number;
}

const BIG_BUDGET_THRESHOLD = 15000;
const BIG_VALUE_THRESHOLD = 20000;

/**
 * Pure: derive market signals from raw inquiry + booking rows. Unit-testable.
 */
export function deriveSignals(
  inquiries: Array<{ destination?: string | null; budget_range?: string | null; created_at?: string }>,
  bookings: Array<{ destination?: string | null; total_amount?: number | null; status?: string }>
): MarketSignal[] {
  const byDest = new Map<string, { inquiries: number; bookings: number; budgets: number[]; values: number[] }>();

  const bump = (dest: string) => {
    if (!dest) return;
    const key = dest.trim();
    if (!byDest.has(key)) byDest.set(key, { inquiries: 0, bookings: 0, budgets: [], values: [] });
  };
  const get = (dest: string) => {
    const key = dest.trim();
    return byDest.get(key)!;
  };

  for (const i of inquiries) {
    if (!i.destination) continue;
    bump(i.destination);
    const rec = get(i.destination);
    rec.inquiries += 1;
    const budget = parseBudget(i.budget_range);
    if (budget !== null) rec.budgets.push(budget);
  }

  for (const b of bookings) {
    if (!b.destination) continue;
    bump(b.destination);
    const rec = get(b.destination);
    rec.bookings += 1;
    if (typeof b.total_amount === "number") rec.values.push(b.total_amount);
  }

  const signals: MarketSignal[] = [];
  byDest.forEach((rec, destination) => {
    signals.push({
      destination,
      inquiries: rec.inquiries,
      bookings: rec.bookings,
      conversionRate: rec.inquiries > 0 ? rec.bookings / rec.inquiries : 0,
      avgBudget:
        rec.budgets.length > 0 ? Math.round(rec.budgets.reduce((a, b) => a + b, 0) / rec.budgets.length) : null,
      avgBookingValue:
        rec.values.length > 0 ? Math.round(rec.values.reduce((a, b) => a + b, 0) / rec.values.length) : null,
    });
  });

  return signals.sort((a, b) => b.inquiries - a.inquiries);
}

function parseBudget(budgetRange?: string | null): number | null {
  if (!budgetRange) return null;
  const nums = budgetRange.match(/\d[\d,.]*/g);
  if (!nums || nums.length === 0) return null;
  const values = nums.map((n) => parseFloat(n.replace(/,/g, ""))).filter((n) => Number.isFinite(n));
  if (values.length === 0) return null;
  const mid = (Math.min(...values) + Math.max(...values)) / 2;
  return Math.round(mid);
}

/**
 * Pure: detect opportunities from signals. Unit-testable.
 */
export function detectOpportunities(signals: MarketSignal[]): Opportunity[] {
  const opps: Opportunity[] = [];
  const maxInquiries = signals.length > 0 ? Math.max(...signals.map((s) => s.inquiries)) : 0;

  for (const s of signals) {
    // High demand with weak conversion → sales/supply gap.
    if (s.inquiries >= 5 && s.conversionRate < 0.25) {
      opps.push({
        destination: s.destination,
        signal: "underserved",
        conviction: 0.7,
        rationale: `${s.inquiries} inquiries but only ${s.bookings} bookings (${Math.round(s.conversionRate * 100)}% conversion) — demand exists but supply or sales is falling short.`,
      });
    }
    // Premium gap: big budgets but booked value below budget.
    if (s.avgBudget !== null && s.avgBudget >= BIG_BUDGET_THRESHOLD && s.avgBookingValue !== null) {
      if (s.avgBookingValue < s.avgBudget * 0.8) {
        opps.push({
          destination: s.destination,
          signal: "premium-gap",
          conviction: 0.6,
          rationale: `Clients budget ~$${s.avgBudget.toLocaleString()} but book ~$${s.avgBookingValue.toLocaleString()} — a premium up-sell opportunity.`,
        });
      }
    }
    if (s.avgBookingValue !== null && s.avgBookingValue >= BIG_VALUE_THRESHOLD) {
      opps.push({
        destination: s.destination,
        signal: "premium-gap",
        conviction: 0.55,
        rationale: `Average booking of $${s.avgBookingValue.toLocaleString()} — this is a high-value market worth emphasis.`,
      });
    }
  }

  // Overall top-demand signal.
  if (maxInquiries >= 5) {
    for (const s of signals) {
      if (s.inquiries === maxInquiries && s.inquiries >= 5) {
        opps.push({
          destination: s.destination,
          signal: "high-demand",
          conviction: 0.8,
          rationale: `Top demand destination with ${s.inquiries} inquiries — headline marketing priority.`,
        });
      }
    }
  }

  return opps;
}

export class MarketIntelligence {
  /**
   * Full market analysis. Reads inquiries + bookings via admin client, derives
   * signals and opportunities, and optionally enriches with an LLM narrative.
   * Returns a report even when the DB is empty or the LLM is unavailable.
   */
  async analyzeMarket(): Promise<MarketReport> {
    const client = createAdminClient();
    const [inquiriesRes, bookingsRes] = await Promise.all([
      client.from("inquiries").select("destination, budget_range").limit(500),
      client.from("bookings").select("destination, total_amount, status").limit(500),
    ]);

    const inquiries = (inquiriesRes.data || []) as Array<{
      destination?: string | null;
      budget_range?: string | null;
    }>;
    const bookings = (bookingsRes.data || []) as Array<{
      destination?: string | null;
      total_amount?: number | null;
      status?: string;
    }>;

    const signals = deriveSignals(inquiries, bookings);
    const opportunities = detectOpportunities(signals);
    const topDestinations = signals.slice(0, 5);

    const report: MarketReport = {
      generatedAt: new Date().toISOString(),
      signals,
      topDestinations,
      opportunities,
    };

    if (opportunities.length > 0) {
      try {
        const brand = getTagline();
        const res = await callLlmJson<{ narrative: string }>([
          {
            role: "system",
            content: `You are Kivara's Market Intelligence agent.${brand ? ` Brand: ${brand}.` : ""} Write a concise strategy narrative identifying where to focus. Output JSON with key "narrative".`,
          },
          {
            role: "user",
            content: `Opportunities: ${JSON.stringify(opportunities.map((o) => ({ destination: o.destination, signal: o.signal, rationale: o.rationale }))).slice(0, 1500)}. Return JSON.`,
          },
        ]);
        if (res.data?.narrative) report.narrative = res.data.narrative;
      } catch {
        // keep report without narrative
      }
    }

    return report;
  }

  /**
   * Scenario planning: produce actionable plans for key strategic questions.
   */
  async scenarioPlan(question: string): Promise<ScenarioPlan> {
    const report = await this.analyzeMarket();
    const top = report.topDestinations[0];

    const scenarios: Record<string, ScenarioPlan> = {
      peak: {
        scenario: "peak",
        label: "Peak-Season Capacity",
        description: "How to maximise yield when demand for top destinations surges.",
        recommendations: [
          top
            ? `Prioritise ${top.destination} marketing spend given ${top.inquiries} current inquiries.`
            : "Grow inquiry volume first before scaling spend.",
          "Raise deposit % to 50% for high-demand destination bookings to secure cash flow.",
          "Reserve premium villa inventory for your highest-ticket clients.",
        ],
        confidence: 0.8,
      },
      new_destination: {
        scenario: "new_destination",
        label: "New Destination Expansion",
        description: "Whether and where to expand the portfolio.",
        recommendations: [
          "Enter destinations with the highest inquiry-to-booking ratio but big budgets.",
          "Sign 2–3 vetted suppliers per target destination before marketing.",
        ],
        confidence: 0.6,
      },
      downtime: {
        scenario: "downtime",
        label: "Off-Season Revenue",
        description: "Smoothing demand during quiet months.",
        recommendations: [
          "Launch romance-weekend packages at 20% off for shoulder-season fill.",
          "Target engagement proposals which are less seasonally sensitive.",
        ],
        confidence: 0.65,
      },
    };

    const key = question.toLowerCase().includes("peak")
      ? "peak"
      : question.toLowerCase().includes("new") || question.toLowerCase().includes("expand")
        ? "new_destination"
        : question.toLowerCase().includes("slow") || question.toLowerCase().includes("off") || question.toLowerCase().includes("season")
          ? "downtime"
          : "peak";

    return scenarios[key];
  }
}

function getTagline(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const brand = require("./knowledge").getBrandKnowledge();
    return brand?.tagline || "";
  } catch {
    return "";
  }
}

export const marketIntelligence = new MarketIntelligence();
