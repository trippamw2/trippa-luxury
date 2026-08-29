import { describe, it, expect } from "vitest";
import { computeSupplierScore } from "@/lib/ai/supplier-intelligence";

describe("supplier-intelligence pure", () => {
  it("scores active high-rated supplier high", () => {
    const s = computeSupplierScore({ status: "active", rating: 4.8, contract_on_file: true, insurance_on_file: true, commission_rate: 8 });
    expect(s.overall).toBeGreaterThan(50);
    expect(s.tier).not.toBe("do-not-use");
  });
  it("penalises blacklisted", () => {
    const s = computeSupplierScore({ status: "blacklisted", rating: 2, contract_on_file: false });
    expect(s.overall).toBeLessThan(50);
    expect(s.tier).toBe("do-not-use");
  });
  it("handles missing rating", () => {
    const s = computeSupplierScore({ status: "active" });
    expect(s.overall).toBeGreaterThanOrEqual(0);
    expect(s.overall).toBeLessThanOrEqual(100);
  });
  it("rewards romance signals in name", () => {
    const s = computeSupplierScore({ name: "Romance Villa Zanzibar", status: "active", rating: 9 });
    expect(s.dimensions.romance).toBeGreaterThan(4);
  });
});
