// ─── Kivara Supplier Intelligence (Master OS §9) ─────────────────────────────
// Builds a Kivara Supplier Score (0–100) across: Luxury, Reliability, Romance
// suitability, Guest experience, Value, Responsiveness and Brand alignment.
// It deliberately does NOT recommend suppliers merely because they are cheap.
// Rule-based scoring, with optional LLM refinement for an appraisal narrative
// that falls back gracefully when no LLM API key is configured.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";
import { callLlmJson } from "./llm";
import { normalizeUuid } from "./uuid";

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

// ─── Append-only performance ledger ─────────────────────────────────────────

/** A subset of the `supplier_performance_observation_type_check` vocabulary. */
export type SupplierObservationType =
  | "booking"
  | "issue"
  | "complaint"
  | "praise"
  | "delay"
  | "cancellation"
  | "cost_variance"
  | "satisfaction"
  | "manual_review";

/** The snake_case shape sent to the `supplier_performance` insert. */
export interface SupplierPerformanceInsertRow {
  supplier_id: string;
  observation_type: SupplierObservationType;
  responsiveness_score: number;
  reliability_score: number;
  quality_score: number;
  /** Never observed by a table read. Stays null rather than being inferred. */
  on_time_score: null;
  client_satisfaction: null;
  issue_severity: number;
  notes: string | null;
  source: "system" | "agent" | "human";
}

/** Dimensions are scored 0–10; the ledger columns are constrained to 0–100. */
function toHundred(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v * 10)));
}

/** For values already expressed on the 0–100 scale, such as `overall`. */
function clampHundred(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Map a scored supplier onto a `supplier_performance` row. Pure, so the
 * column constraints and the honesty rules are testable without a database.
 *
 * Returns null when `supplier.id` is not a UUID: the column is a FK to
 * `suppliers.id`, and a slug id would turn a clean skip into an FK violation.
 *
 * The observation type is `manual_review`, not `satisfaction`. A score computed
 * from the suppliers table reads documented quality signals — rating, contract,
 * insurance, certifications — and has observed no delivery at all. Recording it
 * as `satisfaction` would assert a service outcome that never happened, which
 * is precisely what this ledger must not contain. For the same reason
 * `on_time_score` and `client_satisfaction` are left null: the schema documents
 * NULL as "not observed, never guessed", and a score derived from static rows
 * observed neither punctuality nor satisfaction.
 */
export function buildSupplierPerformanceRow(
  supplier: ScoredSupplier
): SupplierPerformanceInsertRow | null {
  const supplierId = normalizeUuid(supplier.id);
  if (supplierId === null) return null;

  const notes = [
    supplier.score.strengths.length ? `Strengths: ${supplier.score.strengths.join("; ")}` : null,
    supplier.score.concerns.length ? `Concerns: ${supplier.score.concerns.join("; ")}` : null,
  ]
    .filter((n): n is string => n !== null)
    .join(". ");

  return {
    supplier_id: supplierId,
    observation_type: "manual_review",
    responsiveness_score: toHundred(supplier.score.dimensions.responsiveness),
    reliability_score: toHundred(supplier.score.dimensions.reliability),
    quality_score: clampHundred(supplier.score.overall),
    on_time_score: null,
    client_satisfaction: null,
    issue_severity: 0,
    notes: notes || null,
    source: "agent",
  };
}

export interface SupplierPerformanceSink {
  // PromiseLike, not Promise: the Supabase builder is a thenable, so declaring
  // Promise would make the real client structurally unassignable here.
  insert(row: SupplierPerformanceInsertRow): PromiseLike<{ error: { message: string } | null }>;
}

export interface SupplierPerformanceOutcome {
  ok: boolean;
  action: "recorded" | "skipped";
  row: SupplierPerformanceInsertRow | null;
  error: string | null;
}

export function createSupabaseSupplierPerformanceSink(): SupplierPerformanceSink {
  // Built inline rather than through a structural adapter: matching Supabase's
  // deeply generic client trips an excessively deep type instantiation. Env is
  // read here, never at module load, so importing this module in a build or
  // test without env vars does not throw.
  const supabase = createAdminClient();
  return {
    insert: async (row) => {
      const { error } = await supabase.from("supplier_performance").insert(row);
      return { error: error ? { message: error.message } : null };
    },
  };
}

let cachedPerformanceSink: SupplierPerformanceSink | null = null;

function defaultPerformanceSink(): SupplierPerformanceSink {
  if (!cachedPerformanceSink) cachedPerformanceSink = createSupabaseSupplierPerformanceSink();
  return cachedPerformanceSink;
}

/**
 * Append the supplier's appraisal to the immutable performance ledger.
 *
 * Never throws and never rejects, matching `recordEvent` and `recordQcDecision`:
 * losing an institutional-memory write must not fail the scoring run that
 * produced it. The table is append-only, so a failed write leaves no partial
 * state to clean up — only a missing entry, reported as data for the caller.
 */
export async function recordSupplierPerformance(
  supplier: ScoredSupplier,
  sink: SupplierPerformanceSink = defaultPerformanceSink()
): Promise<SupplierPerformanceOutcome> {
  const probe = buildSupplierPerformanceRow(supplier);
  if (probe === null) {
    return { ok: true, action: "skipped", row: null, error: null };
  }

  try {
    const { error } = await sink.insert(probe);
    return { ok: error === null, action: "recorded", row: probe, error: error?.message ?? null };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, action: "skipped", row: probe, error: message };
  }
}
