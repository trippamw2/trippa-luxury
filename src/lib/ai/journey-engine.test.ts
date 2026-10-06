import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the admin client before importing the module under test. This covers
// both knowledge.ts's static import and warmTransferPricing's dynamic one.
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  JourneyEngine,
  primeLiveCatalog,
  resetJourneyEngineCaches,
  warmJourneyInputs,
} from "@/lib/ai/journey-engine";
import type { GuestProfile } from "@/lib/ai/types";
import type { ProductKnowledge } from "@/lib/ai/knowledge";

function chainedQuery(rows: unknown[], error: { message: string } | null = null) {
  const settle = { data: rows, error };
  function chainable(): unknown {
    return new Proxy({} as object, {
      get(_target, prop) {
        if (prop === "select" || prop === "eq" || prop === "order" || prop === "limit" || prop === "in" || prop === "gte" || prop === "contains") {
          return () => chainable();
        }
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => resolve(settle);
        }
        if (prop in settle) return (settle as Record<string, unknown>)[prop as string];
        return undefined;
      },
    });
  }
  return chainable();
}

/**
 * Route `.from()` by table name. `warmJourneyInputs()` runs the pricing and
 * catalog reads in a single `Promise.all`, so arrival order is racy and
 * `mockReturnValueOnce` cannot tell the two apart.
 */
function mockTables(tables: Record<string, { rows: unknown[]; error?: { message: string } }>) {
  mockFrom.mockImplementation((table: string) => {
    const spec = tables[table];
    return chainedQuery(spec?.rows ?? [], spec?.error ?? null);
  });
}

function guest(overrides: Partial<GuestProfile> = {}): GuestProfile {
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
    ...overrides,
  };
}

function product(overrides: Partial<ProductKnowledge>): ProductKnowledge {
  return {
    id: "uuid-1",
    slug: "test-lodge",
    name: "Test Lodge",
    destination: "zanzibar",
    location: "Zanzibar",
    rating: 5,
    roomTypes: [{ name: "Villa" }],
    amenities: ["Private pool"],
    romanticHighlights: ["Sunset dhow cruise"],
    ...overrides,
  };
}

const engine = new JourneyEngine();

beforeEach(() => {
  resetJourneyEngineCaches();
  mockFrom.mockReset();
});

describe("transfer pricing grounding", () => {
  it("honours the operator's park-fee override from platform_settings", async () => {
    mockTables({
      platform_settings: { rows: [{ key: "park_fees_per_day", value: "999" }] },
      properties: { rows: [] },
    });
    await warmJourneyInputs();

    const journey = engine.generate(guest({
      explicitDestinations: [{ destinationId: "south-luangwa", propertyId: "chinzombo", nights: 3 }],
    }));

    const parkFee = journey.pricing.transfers.find((t) => t.label.includes("National Park fees"));
    expect(parkFee?.label).toBe("South Luangwa National Park fees ($999pppn)");
    // 999 pppn x 3 nights x 2 guests
    expect(parkFee?.cost).toBe(5994);
  });

  it("falls back to the shipped $120pppn park fees when the settings query fails", async () => {
    mockTables({
      platform_settings: { rows: [], error: { message: "boom" } },
      properties: { rows: [] },
    });
    await warmJourneyInputs();

    const journey = engine.generate(guest({
      explicitDestinations: [{ destinationId: "south-luangwa", propertyId: "chinzombo", nights: 3 }],
    }));

    const parkFee = journey.pricing.transfers.find((t) => t.label.includes("National Park fees"));
    expect(parkFee?.label).toBe("South Luangwa National Park fees ($120pppn)");
    // 120 pppn x 3 nights x 2 guests
    expect(parkFee?.cost).toBe(720);
  });

  it("warms the active catalog so selection reads live rows", async () => {
    mockTables({
      platform_settings: { rows: [] },
      properties: {
        rows: [{
          id: "uuid-9",
          slug: "test-lodge",
          name: "Test Lodge",
          destination: "zanzibar",
          location: "Zanzibar",
          tagline: "A private hideaway",
          description: "Villas by the sea.",
          price_range: "$700-$1,100",
          rating: 5,
          room_types: [{ name: "Villa" }],
          amenities: ["Private pool"],
          romantic_highlights: ["Sunset dhow cruise"],
          hero_image: "/images/test-lodge.jpg",
        }],
      },
    });
    await warmJourneyInputs();

    const journey = engine.generate(guest({
      explicitDestinations: [{ destinationId: "zanzibar", nights: 4 }],
    }));

    expect(journey.pricing.accommodation).toHaveLength(1);
    expect(journey.pricing.accommodation[0].label).toBe("Test Lodge");
    expect(journey.itinerary.every((d) => d.accommodation === "Test Lodge")).toBe(true);
  });
});

describe("live catalog selection", () => {
  it("selects from the primed catalog, not the constants mirror", () => {
    primeLiveCatalog([product({})]);

    const journey = engine.generate(guest({
      explicitDestinations: [{ destinationId: "zanzibar", nights: 4 }],
    }));

    expect(journey.itinerary.every((d) => d.accommodation === "Test Lodge")).toBe(true);
    const names = journey.pricing.accommodation.map((a) => a.label);
    expect(names).not.toContain("Xanadu Luxury Villas & Retreat");
    expect(names).not.toContain("Baraza Resort & Spa");
  });

  it("restricts a destination to the primed rows even when the mirror has more", () => {
    primeLiveCatalog([
      product({ id: "uuid-2", slug: "pumulani-lodge", name: "Pumulani Lodge", destination: "lake-malawi" }),
      product({ id: "uuid-3", slug: "makokola-retreat", name: "The Makokola Retreat", destination: "lake-malawi" }),
    ]);

    const journey = engine.generate(guest({
      explicitDestinations: [{ destinationId: "lake-malawi", nights: 3 }],
    }));

    const names = journey.pricing.accommodation.map((a) => a.label);
    expect(names).toHaveLength(1);
    expect(["Pumulani Lodge", "The Makokola Retreat"]).toContain(names[0]);
    expect(names).not.toContain("Kaya Mawa");
  });

  it("ignores an empty fetch so a failed properties read cannot wipe a good cache", () => {
    primeLiveCatalog([product({})]);
    primeLiveCatalog([]);

    const journey = engine.generate(guest({
      explicitDestinations: [{ destinationId: "zanzibar", nights: 4 }],
    }));

    expect(journey.pricing.accommodation[0].label).toBe("Test Lodge");
  });

  it("falls back to the constants mirror after resetJourneyEngineCaches", () => {
    primeLiveCatalog([product({})]);
    resetJourneyEngineCaches();

    const journey = engine.generate(guest({
      explicitDestinations: [{ destinationId: "zanzibar", nights: 4 }],
    }));

    const names = journey.pricing.accommodation.map((a) => a.label);
    expect(["Xanadu Luxury Villas & Retreat", "Baraza Resort & Spa"]).toContain(names[0]);
  });
});
