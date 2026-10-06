import { describe, it, expect, vi, beforeEach } from "vitest";

// Override only the commercial policy; the rest of knowledge (brand, catalog)
// stays real so quote-engine's import graph is untouched.
vi.mock("@/lib/ai/knowledge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/knowledge")>();
  return {
    ...actual,
    getCommercialPolicy: () => ({
      currency: "USD",
      depositPercent: 42,
      paymentTerms: "Custom test terms: 42% deposit, balance on arrival.",
      quoteValidityDays: 7,
      bookingPolicy: "Test booking policy.",
      cancellationNote: "Test cancellation note.",
    }),
  };
});

import { QuoteEngine } from "@/lib/ai/quote-engine";
import { resetJourneyEngineCaches } from "@/lib/ai/journey-engine";
import type { GuestProfile } from "@/lib/ai/types";

function guest(): GuestProfile {
  return {
    id: "g1",
    name: "Amara",
    email: "amara@example.com",
    isCouple: true,
    preferences: {
      travelStyle: "romantic",
      accommodationStyle: "luxury-resort",
      activityLevel: "moderate",
      budgetRange: "premium",
    },
    explicitDestinations: [{ destinationId: "south-luangwa", propertyId: "chinzombo", nights: 3 }],
  };
}

const engine = new QuoteEngine();

beforeEach(() => {
  resetJourneyEngineCaches();
});

describe("QuoteEngine commercial-policy grounding", () => {
  it("derives deposit, validity and terms from getCommercialPolicy, not literals", () => {
    const dayBefore = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const quote = engine.generateQuote(guest());
    const dayAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Policy values (42% / 7 days / custom terms) differ from the shipped
    // defaults (30% / 14 days), so these can only come from the policy source.
    expect(quote.depositPercent).toBe(42);
    expect(quote.paymentTerms).toBe("Custom test terms: 42% deposit, balance on arrival.");
    expect([dayBefore, dayAfter]).toContain(quote.validUntil);
    expect(quote.depositRequired).toBe(Math.round(quote.journey.pricing.total * 42 / 100));
  });

  it("stamps the quote reference from the journey id", () => {
    const quote = engine.generateQuote(guest());
    expect(quote.quoteRef).toBe(`Q-${quote.journey.id}`);
    expect(quote.journey.pricing.total).toBeGreaterThan(0);
  });

  it("renders the policy terms into the quote HTML", () => {
    const quote = engine.generateQuote(guest());
    const html = engine.generateQuoteHtml(quote);
    expect(html).toContain("42% deposit, balance on arrival.");
    expect(html).toContain(`(${quote.depositPercent}%)`);
    expect(html).toContain(quote.validUntil);
  });
});
