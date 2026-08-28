import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the admin client before importing the module under test
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  getBrandKnowledge,
  getCommercialPolicy,
  getKnowledgeContext,
  searchProducts,
} from "@/lib/ai/knowledge";

function chainedQuery(rows: unknown[]) {
  const settle = { data: rows, error: null };
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

beforeEach(() => {
  mockFrom.mockReset();
});

describe("getBrandKnowledge", () => {
  it("exposes the Kivara brand canon", () => {
    const brand = getBrandKnowledge();
    expect(brand.name).toBe("Kivara");
    expect(brand.tagline).toContain("Bush");
    expect(brand.valuePropositions.length).toBeGreaterThan(0);
    expect(brand.voiceGuidelines.length).toBeGreaterThan(0);
    expect(brand.signatureExperiences).toContain("Star bed safaris under the African sky");
  });
});

describe("getCommercialPolicy", () => {
  it("exposes the deposit and payment policy", () => {
    const policy = getCommercialPolicy();
    expect(policy.depositPercent).toBe(30);
    expect(policy.currency).toBe("USD");
    expect(policy.paymentTerms).toContain("30% deposit");
    expect(policy.quoteValidityDays).toBe(14);
  });
});

describe("getKnowledgeContext", () => {
  it("assembles brand, commercial, and catalog knowledge", async () => {
    // Order of .from() calls: destinations, properties, packages, experiences
    mockFrom.mockReturnValueOnce(chainedQuery([
      { slug: "south-luangwa", name: "South Luangwa", description: "Wild valley.", highlights: ["Walking safaris"], seasons: [{ name: "Peak", months: "Jun-Oct" }] },
    ]));
    mockFrom.mockReturnValueOnce(chainedQuery([
      { id: "p1", slug: "kaya-mawa", name: "Kaya Mawa", destination: "lake-malawi", location: "Likoma Island", tagline: "Barefoot luxury", description: "A lakeside hideaway.", price_range: "$750-$1,200", rating: 5, room_types: [{ name: "Beach Villa", from: "From $900" }], amenities: ["Private beach", "Spa"], romantic_highlights: ["Sunset sails"] },
    ]));
    mockFrom.mockReturnValueOnce(chainedQuery([
      { id: "pk1", slug: "luangwa-honeymoon", title: "Luangwa Honeymoon", duration: "7 nights", price: "From $6,800", destinations: ["south-luangwa"], inclusions: ["Game drives"], description: "A romantic safari." },
    ]));
    mockFrom.mockReturnValueOnce(chainedQuery([
      { slug: "star-bed", title: "Star Bed Safaris", description: "Sleep under the stars.", category: "Romance" },
    ]));

    const ctx = await getKnowledgeContext({ destination: "south-luangwa" });

    expect(ctx.brand.name).toBe("Kivara");
    expect(ctx.commercial.depositPercent).toBe(30);
    // Destination filter applies
    expect(ctx.destinations.map((d) => d.slug)).toEqual(["south-luangwa"]);
    // Product filtered to destination (none match south-luangwa here)
    expect(ctx.products.filter((p) => p.destination === "south-luangwa").length).toBe(0);
    // Assembled text contains key knowledge
    expect(ctx.assembled).toContain("KIVARA KNOWLEDGE BASE");
    expect(ctx.assembled).toContain("COMMERCIAL POLICY");
    expect(ctx.assembled).toContain("South Luangwa");
    expect(ctx.assembled).toContain("Star Bed Safaris");
  });

  it("honours the product limit", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([])); // destinations
    mockFrom.mockReturnValueOnce(chainedQuery([
      { id: "1", slug: "a", name: "A", destination: "lake-malawi", location: "x", rating: 0, room_types: [], amenities: [], romantic_highlights: [] },
      { id: "2", slug: "b", name: "B", destination: "lake-malawi", location: "y", rating: 0, room_types: [], amenities: [], romantic_highlights: [] },
      { id: "3", slug: "c", name: "C", destination: "lake-malawi", location: "z", rating: 0, room_types: [], amenities: [], romantic_highlights: [] },
    ]));
    mockFrom.mockReturnValueOnce(chainedQuery([])); // packages
    mockFrom.mockReturnValueOnce(chainedQuery([])); // experiences

    const ctx = await getKnowledgeContext({ limitProducts: 2 });
    expect(ctx.products.length).toBe(2);
  });
});

describe("searchProducts", () => {
  it("returns an empty list when nothing matches", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([
      { id: "1", slug: "a", name: "Kaya Mawa", destination: "lake-malawi", location: "Likoma Island", rating: 5, room_types: [], amenities: ["Spa"], romantic_highlights: [] },
    ]));
    const results = await searchProducts("snowboarding");
    expect(results).toEqual([]);
  });

  it("ranks products by name-match highest", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([
      { id: "1", slug: "beach-hideaway", name: "Beach Hideaway", destination: "zanzibar", location: "Nungwi", rating: 4, room_types: [], amenities: ["Private beach"], romantic_highlights: ["Sunset"] },
      { id: "2", slug: "mawa", name: "Kaya Mawa", destination: "lake-malawi", location: "Likoma Island", rating: 5, room_types: [], amenities: ["Private beach", "Spa"], romantic_highlights: ["Beach"] },
    ]));
    const results = await searchProducts("private beach", { limit: 5 });
    // Both match; the name "Beach Hideaway" contains "beach" so it should rank first
    expect(results.length).toBe(2);
    expect(results[0].name).toBe("Beach Hideaway");
  });
});
