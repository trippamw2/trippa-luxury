import { describe, it, expect } from "vitest";
import { scoreChannel, buildChannelMix, recommendByPerformance } from "@/lib/ai/distribution-engine";

describe("distribution-engine pure", () => {
  describe("scoreChannel", () => {
    it("scores instagram high for discovery", () => {
      expect(scoreChannel("instagram", "discovery")).toBeGreaterThan(0.7);
    });
    it("scores email high for nurture", () => {
      expect(scoreChannel("email", "nurture")).toBeGreaterThan(0.6);
    });
    it("returns fallback for unknown channel", () => {
      expect(scoreChannel("unknown", "discovery")).toBe(0.4);
    });
  });

  describe("buildChannelMix", () => {
    it("normalises weights to ~1", () => {
      const mix = buildChannelMix(["instagram", "email", "google"], "discovery");
      const total = mix.reduce((s, m) => s + m.weight, 0);
      expect(total).toBeCloseTo(1, 1);
      expect(mix[0].weight).toBeGreaterThan(0);
    });
    it("sorts by score descending", () => {
      const mix = buildChannelMix(["email", "instagram"], "discovery");
      expect(mix[0].channel).toBe("instagram");
    });
  });

  describe("recommendByPerformance", () => {
    it("weights by ROAS", () => {
      const mix = recommendByPerformance([
        { channel: "instagram", attributedRevenue: 10000, spend: 1000, conversions: 10, impressions: 1000 },
        { channel: "email", attributedRevenue: 5000, spend: 100, conversions: 20, impressions: 500 },
      ]);
      expect(mix[0].channel).toBe("email"); // higher ROAS
    });
    it("handles zero spend", () => {
      const mix = recommendByPerformance([
        { channel: "a", attributedRevenue: 0, spend: 0, conversions: 0, impressions: 0 },
      ]);
      expect(mix[0].weight).toBe(0);
    });
  });
});
