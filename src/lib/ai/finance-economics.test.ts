import { describe, it, expect } from "vitest";
import { computeUnitEconomics } from "@/lib/ai/finance-economics";

describe("finance-economics pure", () => {
  it("computes margins and averages", () => {
    const r = computeUnitEconomics({
      bookings: [
        { total_amount: 10000, final_amount: 10000, balance_amount: 2000 },
        { total_amount: 5000, final_amount: 5000, balance_amount: 0 },
      ],
      payments: [{ amount: 8000, status: "completed" }],
      transactions: [],
      invoices: [],
      expenses: [{ amount: 6000 }, { amount: 1000, description: "commission hotel" }],
    });
    expect(r.revenue).toBe(15000);
    expect(r.expensesTotal).toBe(7000);
    expect(r.grossMargin).toBe(8000);
    expect(r.cashInflow).toBe(8000);
    expect(r.averageBookingValue).toBe(7500);
    expect(r.commissionsEstimated).toBe(1000);
  });
  it("handles empty", () => {
    const r = computeUnitEconomics({ bookings: [], payments: [], transactions: [], invoices: [], expenses: [] });
    expect(r.revenue).toBe(0);
    expect(r.grossMargin).toBe(0);
    expect(r.averageBookingValue).toBe(0);
  });
  it("computes profitability by destination", () => {
    const r = computeUnitEconomics({
      bookings: [{ destination: "Zanzibar", total_amount: 10000 }],
      payments: [], transactions: [], invoices: [], expenses: [],
    });
    expect(r.profitabilityByDestination.some((p) => p.product === "Zanzibar")).toBe(true);
  });
});
