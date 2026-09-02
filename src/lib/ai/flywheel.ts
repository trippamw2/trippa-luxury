// ─── Kivara Flywheel & Platform Defensibility (Master OS §27–28) ─────────────
// Evaluates Kivara's platform maturity and defensibility, and reads platform
// data to fill the flywheel: CUSTOMERS → DATA → INTELLIGENCE → BETTER JOURNEYS
// → BETTER EXPERIENCES → BETTER REVIEWS → MORE TRUST → MORE CUSTOMERS → MORE DATA,
// accelerated by AI → faster learning → better decisions → stronger margins.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";

export type DefensibilityFactor =
  | "proprietary-customer-data"
  | "supplier-network"
  | "exclusive-experiences"
  | "brand"
  | "distribution"
  | "operational-knowledge"
  | "technology"
  | "customer-relationships"
  | "romance-positioning"
  | "owned-assets"
  | "partnerships";

export interface DefensibilityFactorScore {
  factor: DefensibilityFactor;
  label: string;
  score: number; // 0–10
  rationale: string;
}

export interface DefensibilityScore {
  overall: number; // 0–100
  factors: DefensibilityFactorScore[];
  assessment: string;
}

export interface FlywheelMetrics {
  customersCount: number;
  dataPoints: number;
  bookingsCount: number;
  revenueTotal: number;
  suppliersCount: number;
  productsCount: number;
  journeysCount: number;
}

export interface FlywheelReport {
  generatedAt: string;
  loop: { step: string; value: number | string; note: string }[];
  defensibility: DefensibilityScore;
  metrics: FlywheelMetrics;
}

const FACTOR_LABELS: Record<DefensibilityFactor, string> = {
  "proprietary-customer-data": "Proprietary customer data",
  "supplier-network": "Supplier network",
  "exclusive-experiences": "Exclusive experiences",
  brand: "Brand",
  distribution: "Distribution",
  "operational-knowledge": "Operational knowledge",
  technology: "Technology",
  "customer-relationships": "Customer relationships",
  "romance-positioning": "Unique romance positioning",
  "owned-assets": "Owned / operated assets",
  partnerships: "Partnerships",
};

/**
 * Pure defensibility scoring from a set of factor scores 0–10 (optional,
 * falls back to a conservative default). Unit-testable.
 */
export function computeDefensibility(
  scores: Partial<Record<DefensibilityFactor, number>>
): DefensibilityScore {
  const factors: DefensibilityFactorScore[] = (Object.keys(FACTOR_LABELS) as DefensibilityFactor[]).map(
    (f) => {
      const raw = scores[f];
      const value = typeof raw === "number" ? Math.max(0, Math.min(10, raw)) : 1;
      return {
        factor: f,
        label: FACTOR_LABELS[f],
        score: value,
        rationale: value >= 8 ? "Strong moat" : value >= 5 ? "Developing moat" : "Early / not yet defensible",
      };
    }
  );

  const overall = Math.round(
    factors.reduce((s, f) => s + f.score, 0) / factors.length * 10
  );

  const assessment =
    overall >= 70
      ? "Kivara has a strong, compounding defensibility moat across multiple factors."
      : overall >= 45
        ? "Kivara is building real defensibility; prioritise the highest-leverage factors next."
        : "Kivara's moat is early-stage; concentrate on proprietary data, brand and the supplier network first.";

  return { overall, factors, assessment };
}

/**
 * Pure: derive per-factor defensibility scores from observed platform data.
 * Unit-testable; returns 0–10 scores.
 */
export function deriveFactorScores(m: FlywheelMetrics): Partial<Record<DefensibilityFactor, number>> {
  const clamp = (v: number) => Math.max(0, Math.min(10, Math.round(v * 10) / 10));

  return {
    "proprietary-customer-data": clamp(Math.log10(m.customersCount + 1)),
    "supplier-network": clamp(m.suppliersCount / 3),
    "exclusive-experiences": clamp(m.journeysCount / 2),
    brand: 7, // strategic asset already being actively curated
    distribution: 3, // early-stage channel work
    "operational-knowledge": clamp((m.bookingsCount + m.journeysCount) / 6),
    technology: 7, // AI-native platform already in place
    "customer-relationships": clamp(Math.log10(m.customersCount + 1)),
    "romance-positioning": 9, // core, differentiated positioning
    "owned-assets": 1, // none yet — long-term ambition
    partnerships: 3, // early partnership work
  };
}

export class Flywheel {
  /**
   * Read platform data and produce the flywheel + defensibility report.
   * Falls back gracefully if any table is unavailable.
   */
  async report(): Promise<FlywheelReport> {
    const supabase = createAdminClient();
    const [bookings, inquiries, suppliers, journeys] = await Promise.all([
      supabase.from("bookings").select("id, total_amount"),
      supabase.from("inquiries").select("id"),
      supabase.from("suppliers").select("id"),
      supabase.from("saved_journeys").select("id"),
    ]);

    const bookingRows = bookings.data || [];
    const supplierRows = suppliers.data || [];
    const journeyRows = journeys.data || [];

    let productsCount = 0;
    for (const key of ["properties", "packages", "experiences", "tours"] as const) {
      const r = await supabase.from(key).select("id");
      productsCount += (r.data || []).length;
    }

    const metrics: FlywheelMetrics = {
      customersCount: (inquiries.data || []).length,
      dataPoints: bookingRows.length + (inquiries.data || []).length,
      bookingsCount: bookingRows.length,
      revenueTotal: bookingRows.reduce((s, b) => s + Number((b as Record<string, unknown>).total_amount || 0), 0),
      suppliersCount: supplierRows.length,
      productsCount,
      journeysCount: journeyRows.length,
    };

    const defensibility = computeDefensibility(deriveFactorScores(metrics));

    return {
      generatedAt: new Date().toISOString(),
      loop: [
        { step: "Customers", value: metrics.customersCount, note: "Tracked customer interactions (inquiries)" },
        { step: "Data", value: metrics.dataPoints, note: "Data points across bookings + inquiries" },
        { step: "Intelligence", value: metrics.journeysCount, note: "Curated journeys feeding learning" },
        { step: "Better journeys", value: metrics.journeysCount, note: "AI learns from every journey" },
        { step: "Experiences", value: metrics.productsCount, note: "Product / experience catalogue" },
        { step: "Trust & brand", value: "romance-positioning", note: "Differentiated luxury-romance brand" },
        { step: "Margin", value: metrics.revenueTotal, note: "Revenue base for margin optimisation" },
      ],
      defensibility,
      metrics,
    };
  }
}

export const flywheel = new Flywheel();
