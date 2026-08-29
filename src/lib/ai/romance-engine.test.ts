import { describe, it, expect } from "vitest";
import { detectOccasion, buildEmotionArc, buildEmotionProfile } from "@/lib/ai/romance-engine";

describe("romance-engine pure", () => {
  describe("detectOccasion", () => {
    it("detects honeymoon", () => {
      const r = detectOccasion("We are planning our honeymoon in Zanzibar");
      expect(r.occasion).toBe("honeymoon");
      expect(r.confidence).toBeGreaterThan(0.3);
    });
    it("detects proposal", () => {
      expect(detectOccasion("I want to propose on the beach").occasion).toBe("proposal");
    });
    it("detects anniversary", () => {
      expect(detectOccasion("10 year anniversary trip").occasion).toBe("anniversary");
    });
    it("falls back to couples for couple language", () => {
      expect(detectOccasion("we as a couple want a getaway").occasion).toBe("couples");
    });
    it("returns unknown for empty", () => {
      expect(detectOccasion("").occasion).toBe("unknown");
    });
  });

  describe("buildEmotionArc", () => {
    it("returns 6 stages Emotion→Memory", () => {
      const arc = buildEmotionArc("honeymoon");
      expect(arc).toHaveLength(6);
      expect(arc[0].stage).toBe("Emotion");
      expect(arc[5].stage).toBe("Memory");
    });
    it("customises honeymoon intent", () => {
      const arc = buildEmotionArc("honeymoon");
      expect(arc[0].intent).toBe("Begin");
    });
    it("works for unknown", () => {
      expect(buildEmotionArc("unknown")).toHaveLength(6);
    });
  });

  describe("buildEmotionProfile", () => {
    it("builds honeymoon profile", () => {
      const p = buildEmotionProfile("honeymoon");
      expect(p.occasion).toBe("honeymoon");
      expect(p.arc).toHaveLength(6);
      expect(p.couplePsychology.length).toBeGreaterThan(10);
    });
  });
});
