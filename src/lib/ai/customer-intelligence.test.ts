import { describe, it, expect } from "vitest";
import {
  computeEngagementScore,
  computeRelationshipDepth,
  computeLtvPrediction,
  computeChurnRisk,
  recommendNextAction,
} from "@/lib/ai/customer-intelligence";

describe("customer intelligence scoring", () => {
  describe("computeEngagementScore", () => {
    it("returns 0 for completely detached customers", () => {
      expect(computeEngagementScore({
        daysSinceLastContact: 999,
        interactionCount30d: 0,
        interactionCount90d: 0,
        inquiryCount: 0,
        bookingCount: 0,
        journeyViewCount: 0,
      })).toBe(0);
    });

    it("rewards very recent contact heavily", () => {
      const score = computeEngagementScore({
        daysSinceLastContact: 0,
        interactionCount30d: 1,
        interactionCount90d: 3,
        inquiryCount: 1,
        bookingCount: 0,
        journeyViewCount: 1,
      });
      expect(score).toBeGreaterThan(30);
    });

    it("caps at 100", () => {
      const score = computeEngagementScore({
        daysSinceLastContact: 1,
        interactionCount30d: 10,
        interactionCount90d: 50,
        inquiryCount: 5,
        bookingCount: 5,
        journeyViewCount: 5,
      });
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe("computeRelationshipDepth", () => {
    it("scores a well-known customer higher than a stranger", () => {
      const rich = computeRelationshipDepth({
        hasPhone: true, hasCountry: true, hasSpecialOccasion: true, hasAnniversaryDate: true,
        hasDietaryRestrictions: true, hasInterests: true, hasPastDestinations: true,
        hasWishlist: true, hasNotes: true, interactionCount: 20, bookingCount: 3,
      });
      const poor = computeRelationshipDepth({
        hasPhone: false, hasCountry: false, hasSpecialOccasion: false, hasAnniversaryDate: false,
        hasDietaryRestrictions: false, hasInterests: false, hasPastDestinations: false,
        hasWishlist: false, hasNotes: false, interactionCount: 0, bookingCount: 0,
      });
      expect(rich).toBeGreaterThan(poor);
      expect(rich).toBeLessThanOrEqual(100);
    });
  });

  describe("computeLtvPrediction", () => {
    it("predicts higher LTV for VIP repeat customers", () => {
      const base = computeLtvPrediction({
        totalSpent: 10000, bookingCount: 1, averageBookingValue: 10000, leadScore: 50, isVip: false,
      });
      const vip = computeLtvPrediction({
        totalSpent: 10000, bookingCount: 3, averageBookingValue: 5000, leadScore: 80, isVip: true,
      });
      expect(vip).toBeGreaterThan(base);
    });

    it("honours total spend as the floor", () => {
      const ltv = computeLtvPrediction({
        totalSpent: 5000, bookingCount: 1, averageBookingValue: 5000, leadScore: 10, isVip: false,
      });
      expect(ltv).toBeGreaterThanOrEqual(5000);
    });
  });

  describe("computeChurnRisk", () => {
    it("flags long-silent customers as high risk", () => {
      const risk = computeChurnRisk({
        daysSinceLastContact: 400,
        daysSinceLastTrip: 400,
        hasOpenInquiry: false,
        hasUpcomingBooking: false,
        engagementScore: 10,
      });
      expect(risk).toBeGreaterThan(0.5);
    });

    it("keeps actively engaged customers low risk", () => {
      const risk = computeChurnRisk({
        daysSinceLastContact: 5,
        daysSinceLastTrip: 10,
        hasOpenInquiry: true,
        hasUpcomingBooking: true,
        engagementScore: 80,
      });
      expect(risk).toBeLessThan(0.3);
    });
  });

  describe("recommendNextAction", () => {
    it("warns about upcoming occasions", () => {
      const action = recommendNextAction({
        engagementScore: 70, leadTier: "hot", churnRisk: 0.1,
        hasOpenInquiry: true, daysSinceLastContact: 1, daysUntilOccasion: 10,
        hasUpcomingBooking: true, lifecycle: "booked",
      });
      expect(action).toContain("Occasion reminder");
    });

    it("suggests win-back for at-risk travellers", () => {
      const action = recommendNextAction({
        engagementScore: 10, leadTier: "cold", churnRisk: 0.7,
        hasOpenInquiry: false, daysSinceLastContact: 300, daysUntilOccasion: null,
        hasUpcomingBooking: false, lifecycle: "travelled",
      });
      expect(action).toContain("Win-back");
    });

    it("suggests follow-up for stale open inquiries", () => {
      const action = recommendNextAction({
        engagementScore: 40, leadTier: "warm", churnRisk: 0.3,
        hasOpenInquiry: true, daysSinceLastContact: 10, daysUntilOccasion: null,
        hasUpcomingBooking: false, lifecycle: "inquiry",
      });
      expect(action).toContain("Follow-up");
    });

    it("falls back to monitor for healthy customers", () => {
      const action = recommendNextAction({
        engagementScore: 70, leadTier: "hot", churnRisk: 0.1,
        hasOpenInquiry: true, daysSinceLastContact: 1, daysUntilOccasion: null,
        hasUpcomingBooking: true, lifecycle: "booked",
      });
      expect(action.toLowerCase()).toContain("monitor");
    });
  });
});
