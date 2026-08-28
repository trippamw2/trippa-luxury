import { describe, it, expect } from "vitest";
import { runQualityGate } from "@/lib/ai/quality-gate";
import type { CuratedJourney, GuestProfile } from "@/lib/ai/types";

function makeJourney(overrides?: Partial<CuratedJourney>): CuratedJourney {
  const guest: GuestProfile = {
    id: "guest-test",
    name: "Test Guest",
    email: "test@example.com",
    isCouple: true,
    preferences: {
      travelStyle: "romantic",
      accommodationStyle: "luxury-resort",
      activityLevel: "moderate",
      budgetRange: "premium",
    },
  };

  return {
    id: "journey-test",
    title: "Luxury Zambia Escape",
    subtitle: "A curated 7-night journey",
    guestProfile: guest,
    destinations: ["South Luangwa", "Victoria Falls"],
    duration: 2,
    pricing: {
      accommodation: [
        { label: "Lodge A", nights: 1, ratePerNight: 400, ratePerNightPPPN: 400, subtotal: 400 },
        { label: "Lodge B", nights: 1, ratePerNight: 350, ratePerNightPPPN: 350, subtotal: 350 },
      ],
      activities: [],
      transfers: [{ label: "All private charters & road transfers", cost: 250 }],
      subtotal: 1000, // accommodation (750) + transfers (250)
      taxes: 100,     // 10% of subtotal
      total: 1100,    // subtotal + taxes
      currency: "USD",
    },
    itinerary: [
      {
        day: 1,
        title: "Arrival",
        location: "South Luangwa",
        accommodation: "Lodge A",
        activities: [{ title: "Check-in", description: "Arrive and settle in", duration: "1h", included: true, type: "cultural" }],
        meals: ["Dinner"],
        transfers: [],
        highlights: [],
        notes: "",
      },
      {
        day: 2,
        title: "Departure",
        location: "Victoria Falls",
        accommodation: "Lodge B",
        activities: [{ title: "Check-out", description: "Depart for next lodge", duration: "1h", included: true, type: "cultural" }],
        meals: ["Breakfast"],
        transfers: [],
        highlights: [],
        notes: "",
      },
    ],
    highlights: ["Private game drives", "Bush breakfast"],
    includedExtras: [],
    createdAt: new Date().toISOString(),
    status: "draft",
    ...overrides,
  };
}

function depositFor(journey: CuratedJourney, percent = 30): number {
  return Math.round(journey.pricing.total * (percent / 100));
}

describe("runQualityGate", () => {
  it("passes on a fully valid journey", () => {
    const journey = makeJourney();
    const verdict = runQualityGate(journey, depositFor(journey));
    expect(verdict.ok).toBe(true);
    expect(verdict.severity).toBe("pass");
    expect(verdict.issues).toHaveLength(0);
  });

  it("fails when total is zero", () => {
    const journey = makeJourney({
      pricing: { ...makeJourney().pricing, total: 0 },
    });
    const verdict = runQualityGate(journey, depositFor(journey));
    expect(verdict.ok).toBe(false);
    expect(verdict.issues.map((i) => i.code)).toContain("NONPOSITIVE_TOTAL");
  });

  it("fails when accommodation subtotal does not match line items", () => {
    const journey = makeJourney();
    // tamper: inflate subtotal but keep total = subtotal + taxes (consistent)
    journey.pricing.subtotal = 9999;
    journey.pricing.taxes = 1000;
    journey.pricing.total = 10999;
    const verdict = runQualityGate(journey, depositFor(journey));
    expect(verdict.ok).toBe(false);
    expect(verdict.issues.map((i) => i.code)).toContain("ACCOMMODATION_SUM_MISMATCH");
  });

  it("fails when deposit does not match 30% of total", () => {
    const journey = makeJourney();
    const verdict = runQualityGate(journey, 1000);
    expect(verdict.ok).toBe(false);
    expect(verdict.issues.map((i) => i.code)).toContain("DEPOSIT_MISMATCH");
  });
});
