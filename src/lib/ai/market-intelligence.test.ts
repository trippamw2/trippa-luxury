import { describe, it, expect } from "vitest";
import { deriveSignals, detectOpportunities } from "@/lib/ai/market-intelligence";

describe("market-intelligence pure", () => {
  describe("deriveSignals", () => {
    it("aggregates inquiries and bookings by destination", () => {
      const signals = deriveSignals(
        [
          { destination: "Zanzibar", budget_range: "$10,000 - $15,000" },
          { destination: "Zanzibar", budget_range: "$20,000" },
          { destination: "Kenya", budget_range: null },
        ],
        [{ destination: "Zanzibar", total_amount: 12000, status: "confirmed" }]
      );
      const zan = signals.find((s) => s.destination === "Zanzibar")!;
      expect(zan.inquiries).toBe(2);
      expect(zan.bookings).toBe(1);
      expect(zan.conversionRate).toBe(0.5);
      expect(zan.avgBudget).not.toBeNull();
    });
    it("handles empty input", () => {
      expect(deriveSignals([], [])).toEqual([]);
    });
    it("sorts by inquiries descending", () => {
      const signals = deriveSignals(
        [{ destination: "A" }, { destination: "A" }, { destination: "B" }],
        []
      );
      expect(signals[0].destination).toBe("A");
    });
  });

  describe("detectOpportunities", () => {
    it("flags underserved destination", () => {
      const opps = detectOpportunities([
        { destination: "Zanzibar", inquiries: 10, bookings: 1, conversionRate: 0.1, avgBudget: 10000, avgBookingValue: 8000 },
      ]);
      expect(opps.some((o) => o.signal === "underserved")).toBe(true);
    });
    it("flags premium-gap for high booking value", () => {
      const opps = detectOpportunities([
        { destination: "Mauritius", inquiries: 3, bookings: 3, conversionRate: 1, avgBudget: 10000, avgBookingValue: 25000 },
      ]);
      expect(opps.some((o) => o.signal === "premium-gap")).toBe(true);
    });
    it("flags high-demand for top destination", () => {
      const opps = detectOpportunities([
        { destination: "Zanzibar", inquiries: 10, bookings: 5, conversionRate: 0.5, avgBudget: null, avgBookingValue: null },
        { destination: "Kenya", inquiries: 2, bookings: 1, conversionRate: 0.5, avgBudget: null, avgBookingValue: null },
      ]);
      expect(opps.some((o) => o.signal === "high-demand" && o.destination === "Zanzibar")).toBe(true);
    });
  });
});
