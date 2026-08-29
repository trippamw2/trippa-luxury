import { describe, it, expect } from "vitest";
import { computeDefensibility, deriveFactorScores } from "@/lib/ai/flywheel";

describe("flywheel pure", () => {
  it("computes weighted defensibility", () => {
    const s = computeDefensibility({ brand: 8, technology: 7, "romance-positioning": 9 });
    expect(s.overall).toBeGreaterThan(0);
    expect(s.overall).toBeLessThanOrEqual(100);
    expect(s.factors.find((f) => f.factor === "brand")!.score).toBe(8);
  });
  it("derives factor scores from metrics", () => {
    const scores = deriveFactorScores({ customersCount: 100, dataPoints: 120, bookingsCount: 20, revenueTotal: 50000, suppliersCount: 10, productsCount: 20, journeysCount: 30 });
    expect(scores["supplier-network"]).toBeDefined();
    expect(scores["proprietary-customer-data"]).toBeDefined();
  });
  it("defaults missing factors to 1", () => {
    const s = computeDefensibility({});
    expect(s.overall).toBeGreaterThan(0);
  });
});
