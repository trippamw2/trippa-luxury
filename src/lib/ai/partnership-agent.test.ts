import { describe, it, expect } from "vitest";
import { scorePartner } from "@/lib/ai/partnership-agent";

describe("partnership-agent pure", () => {
  it("scores hotel highest baseline", () => {
    const h = scorePartner({ name: "Hotel A", type: "hotel" });
    const o = scorePartner({ name: "Other", type: "other" });
    expect(h.fit).toBeGreaterThan(o.fit);
  });
  it("rewards romance tags", () => {
    const withTag = scorePartner({ name: "X", type: "hotel", tags: ["romance", "luxury"] });
    const without = scorePartner({ name: "Y", type: "hotel", tags: [] });
    expect(withTag.fit).toBeGreaterThan(without.fit);
    expect(withTag.strengths.join(" ")).toContain("Romance");
  });
  it("tiers correctly", () => {
    const strategic = scorePartner({ name: "Top", type: "hotel", country: "Zanzibar", city: "Stone Town", tags: ["romance", "luxury", "boutique"], reach: 100000, commissionWilling: 0.2 });
    expect(strategic.tier).toBe("strategic");
    const weak = scorePartner({ name: "Weak", type: "other" });
    expect(weak.tier).toBe("exploratory");
  });
  it("caps at 100", () => {
    const s = scorePartner({ name: "Max", type: "hotel", country: "Kenya", city: "Nairobi", tags: ["romance", "honeymoon", "luxury", "boutique", "spa", "villa", "safari", "beach"], reach: 999999, commissionWilling: 0.5 });
    expect(s.fit).toBeLessThanOrEqual(100);
  });
});
