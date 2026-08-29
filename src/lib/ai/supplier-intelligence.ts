// ─── Kivara Supplier Intelligence (Master OS §9) ─────────────────────────────
// Builds a Kivara Supplier Score (0–100) across: Luxury, Reliability, Romance
// suitability, Guest experience, Value, Responsiveness and Brand alignment.
// It deliberately does NOT recommend suppliers merely because they are cheap.
// Rule-based scoring, with optional LLM refinement for an appraisal narrative
// that falls back gracefully when OPENROUTER_API_KEY is absent.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";
import { callLlmJson } from "./llm";

export interface SupplierScoreDimensions {
  luxury: number; // 0–10
  reliability: number; // 0–10
  romance: number; // 0–10
  guestExperience: number; // 0–10
  value: number; // 0–10
  responsiveness: number; // 0–10
  brandAlignment: number; // 0–10
}

export interface SupplierScore {
  overall: number; // 0–100
  dimensions: SupplierScoreDimensions;
  tier: "preferred" | "approved" | "watch" | "do-not-use";
  strengths: string[];
  concerns: string[];
}

export interface ScoredSupplier {
  id: string;
  name: string;
  category?: string;
  country?: string;
  city?: string;
  commissionRate?: number;
  rating?: number;
  status?: string;
  score: SupplierScore;
}

/**
 * Pure scoring of a supplier row (snake_case DB shape). Unit-testable.
 */
export function computeSupplierScore(row: Record<string, unknown>): SupplierScore {
  const num = (v: unknown, fallback = 5) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : fallback;
  };
  const bool = (v: unknown) => v === true;

  const rating = num(row.rating);
  const status = String(row.status || "active");

  // Value: a balance of fair pricing + certification + contract + insurance.
  // Cheap is a signal, not a virtue — weight documented quality above price.
  const commissionRate = num(row.commission_rate, 10);
  const value =
    (bool(row.contract_on_file) ? 2 : 0) +
    (bool(row.insurance_on_file) ? 2 : 0) +
    Math.min(3, (row.certifications as unknown[] | undefined)?.length ?? 0) +
    Math.max(0, Math.min(3, rating - 4));

  // Luxury derives from rating + documented quality signals + brand posture.
  const luxury = Math.max(0, Math.min(10, rating * 0.6 + (bool(row.contract_on_file) ? 2 : 0) + 1));

  // Reliability from status + contract + insurance.
  let reliability = 5;
  if (status === "active") reliability += 2;
  if (bool(row.contract_on_file)) reliability += 1.5;
  if (bool(row.insurance_on_file)) reliability += 1;
  reliability = Math.max(0, Math.min(10, reliability));

  // Romance suitability: base on category + name/notes signals.
  const notes = String(row.notes || "").toLowerCase();
  const name = String(row.name || "").toLowerCase();
  const romanceSignals = ["romance", "honeymoon", "couple", "private", "villa", "beach", "safari", "spa", "candle"];
  const romanceHits = romanceSignals.filter((s) => notes.includes(s) || name.includes(s)).length;
  const romance = Math.max(0, Math.min(10, 4 + romanceHits));

  // Guest experience from rating + certifications breadth.
  const guestExperience = Math.max(
    0,
    Math.min(10, rating * 0.6 + Math.min(4, (row.certifications as unknown[] | undefined)?.length ?? 0))
  );

  // Responsiveness heuristic: commission + engagement (approximated from rating/status).
  const responsiveness = Math.max(0, Math.min(10, rating * 0.5 + (status === "active" ? 2 : 0) + (commissionRate >= 8 ? 1 : 0)));

  // Brand alignment approximates how premium/positioned the supplier appears.
  const brandAlignment = Math.max(0, Math.min(10, rating * 0.7 + (romanceHits ? 1 : 0) + (bool(row.contract_on_file) ? 1 : 0)));

  const dimensions: SupplierScoreDimensions = {
    luxury: round1(luxury),
    reliability: round1(reliability),
    romance: round1(romance),
    guestExperience: round1(guestExperience),
    value: round1(value),
    responsiveness: round1(responsiveness),
    brandAlignment: round1(brandAlignment),
  };

  const overall = Math.round(
    (luxury * 0.18 +
      reliability * 0.18 +
      romance * 0.16 +
      guestExperience * 0.14 +
      value * 0.12 +
      responsiveness * 0.11 +
      brandAlignment * 0.11) *
      10
  );

  const tier: SupplierScore["tier"] =
    status === "blacklisted"
      ? "do-not-use"
      : overall >= 75
        ? "preferred"
        : overall >= 55
          ? "approved"
          : overall >= 35
            ? "watch"
            : "do-not-use";

  const strengths: string[] = [];
  const concerns: string[] = [];
  if (dimensions.luxury >= 7) strengths.push("High luxury standard");
  if (dimensions.romance >= 7) strengths.push("Strong romance suitability");
  if (dimensions.reliability >= 7) strengths.push("Reliable and documented");
  if (dimensions.brandAlignment >= 7) strengths.push("Strong brand alignment");
  if (status === "blacklisted") concerns.push("Blacklisted — do not use");
  if (dimensions.reliability < 5) concerns.push("Reliability concerns");
  if (dimensions.value < 4) concerns.push("Poor documented value");

  return { overall, dimensions, tier, strengths, concerns };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

type PromiseLike<T> = T | Promise<T>;

export class SupplierIntelligence {
  private async withNarrative<T>(input: T, build: (t: T) => Promise<string | null>): Promise<T> {
    return build(input).then(() => input).catch(() => input);
  }

  /**
   * Score every supplier from the real `suppliers` + `supplier_services` tables.
   * Never throws on missing data — returns an empty list if the table is empty.
   */
  async scoreAllSuppliers(): Promise<ScoredSupplier[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select("*, supplier_categories!left(slug, name)");

    if (error || !data) {
      console.error("Supplier intelligence fetch error:", error?.message);
      return [];
    }

    return (data as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      name: String(row.name || "Unknown"),
      category: (row.supplier_categories as { slug?: string } | null)?.slug || "lodge",
      country: (row.country as string) || undefined,
      city: (row.city as string) || undefined,
      commissionRate: row.commission_rate as number | undefined,
      rating: row.rating as number | undefined,
      status: (row.status as string) || undefined,
      score: computeSupplierScore(row),
    }));
  }

  /** Score a single supplier by id. */
  async scoreSupplier(id: string): Promise<ScoredSupplier | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select("*, supplier_categories!left(slug, name)")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    return {
      id: String(row.id),
      name: String(row.name || "Unknown"),
      category: (row.supplier_categories as { slug?: string } | null)?.slug || "lodge",
      country: (row.country as string) || undefined,
      city: (row.city as string) || undefined,
      commissionRate: row.commission_rate as number | undefined,
      rating: row.rating as number | undefined,
      status: (row.status as string) || undefined,
      score: computeSupplierScore(row),
    };
  }

  /**
   * Produce an LLM appraisal narrative for a scored supplier.
   * Falls back to a deterministic summary if the LLM is unavailable.
   */
  async appraise(supplier: ScoredSupplier): Promise<{ narrative: string; source: "llm" | "rules" }> {
    const prompt = `Write a 2–3 sentence luxury-supplier appraisal for "${supplier.name}" (category ${supplier.category ?? "unknown"}). Kivara Supplier Score ${supplier.score.overall}/100, tier ${supplier.score.tier}. Strengths: ${supplier.score.strengths.join(", ") || "none recorded"}. Concerns: ${supplier.score.concerns.join(", ") || "none"}. Focus on brand fit and romance suitability for an African luxury romance journey house. Do not invent facts.`;

    try {
      let result: { narrative?: string } = {};
      result = (await callLlmJson<{ narrative?: string }>(
        [
          { role: "system", content: "You are the Kivara Supplier Intelligence appraisal writer. Be calm, discreet, intelligent and on-brand. Output JSON." },
          { role: "user", content: prompt },
        ],
        { temperature: 0.4 }
      )).data as { narrative?: string };
      const narrative = result?.narrative?.trim();
      if (narrative) return { narrative, source: "llm" };
    } catch {
      // fall through to rules
    }

    const narrative =
      `${supplier.name} is a ${supplier.score.tier} supplier for Kivara (score ${supplier.score.overall}/100). ` +
      (supplier.score.strengths.length ? `Notable strengths: ${supplier.score.strengths.join("; ")}. ` : "") +
      (supplier.score.concerns.length ? `Watch: ${supplier.score.concerns.join("; ")}.` : "Recommended for brand-fit journeys.");
    return { narrative, source: "rules" };
  }
}

export const supplierIntelligence = new SupplierIntelligence();
