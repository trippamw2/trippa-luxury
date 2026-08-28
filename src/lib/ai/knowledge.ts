// ─── Kivara Knowledge System ──────────────────────────────────────────────
// The central knowledge store that every AI agent queries. It keeps brand,
// destination, product, and commercial knowledge in one authoritative place
// so proposals are on-brand and factually grounded in the real catalog.
//
// Sections:
//   1. Types
//   2. Brand canon (static, curated — the authoritative voice/positioning)
//   3. Commercial policy (deposits, payment terms)
//   4. Retrieval: destination + product knowledge from the DB
//   5. Unified context assembly for agents
//   6. Keyword product search
//
// The static brand/commercial knowledge is curated here because it encodes
// founder intent and is not subject to DB churn. The destination and product
// knowledge is retrieved live from Supabase so it always reflects the current
// catalog.

import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel } from "@/lib/api-helpers";

// ─── 1. Types ─────────────────────────────────────────────────────────────

export interface BrandKnowledge {
  name: string;
  tagline: string;
  positioning: string;
  valuePropositions: string[];
  voiceGuidelines: string[];
  audience: string;
  conciergeEthos: string;
  signatureExperiences: string[];
}

export interface CommercialPolicy {
  currency: string;
  depositPercent: number;
  paymentTerms: string;
  quoteValidityDays: number;
  bookingPolicy: string;
  cancellationNote: string;
}

export interface DestinationKnowledge {
  slug: string;
  name: string;
  description: string;
  highlights: string[];
  seasons: Array<{ name: string; months: string }>;
}

export interface ProductKnowledge {
  id: string;
  slug: string;
  name: string;
  destination: string;
  location: string;
  tagline?: string;
  description?: string;
  priceRange?: string;
  rating: number;
  roomTypes: Array<{ name?: string; from?: string; description?: string }>;
  amenities: string[];
  romanticHighlights: string[];
}

export interface PackageKnowledge {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  duration?: string;
  price?: string;
  destinations: string[];
  inclusions: string[];
}

export interface KnowledgeContext {
  brand: BrandKnowledge;
  commercial: CommercialPolicy;
  query?: string;
  destinations: DestinationKnowledge[];
  products: ProductKnowledge[];
  packages: PackageKnowledge[];
  experiences: Array<{ slug: string; title: string; description: string; category: string }>;
  assembled: string;
}

// ─── 2. Brand canon ────────────────────────────────────────────────────────

export function getBrandKnowledge(): BrandKnowledge {
  return {
    name: "Kivara",
    tagline: "Bush · Beach · Romance",
    positioning:
      "Kivara is a private luxury travel atelier curating bespoke romantic journeys across Southern and East Africa — from the wild elegance of South Luangwa to the crystalline calm of Lake Malawi and the spice-scented shores of Zanzibar.",
    valuePropositions: [
      "Truly bespoke journeys — never templates, every itinerary is hand-curated to the guest.",
      "Luxury with soul — barefoot elegance, not stiff formality; 'luxury' that still feels wild and real.",
      "End-to-end concierge — one dedicated concierge owns every detail from first inquiry to return home.",
      "Romance as the craft — proposal, honeymoon, anniversary, vow renewal: special occasions are our specialty.",
    ],
    voiceGuidelines: [
      "Warm, intimate, and personal — write to one guest, never a crowd.",
      "Evocative and sensory — paint scenes (starlight, campfire, bush wind), not feature lists.",
      "Refined but never stuffy — 'barefoot luxury'; elegant prose with warmth.",
      "Confident and understated — let the places speak; avoid hype or exclamation marks.",
      "Use 'you' and 'your' throughout; the guest is the hero of the story.",
    ],
    audience:
      "Discerning couples and independent travellers seeking a once-in-a-lifetime, romantic, off-the-beaten-path luxury journey.",
    conciergeEthos:
      "Every Kivara guest has a personal concierge who owns the entire experience — personalising the journey, refining details, and being reachable throughout.",
    signatureExperiences: [
      "Star bed safaris under the African sky",
      "Sunset dhow cruises on the Zanzibar channel",
      "Private bush dining by lantern light",
      "Walking safaris through the South Luangwa",
      "Couples spa rituals in open-air pavilions",
      "Private beach dining with toes in the sand",
    ],
  };
}

// ─── 3. Commercial policy ─────────────────────────────────────────────────

export function getCommercialPolicy(): CommercialPolicy {
  return {
    currency: "USD",
    depositPercent: 30,
    paymentTerms:
      "A 30% deposit is requested to secure your reservation. The balance will be due 30 days before your departure.",
    quoteValidityDays: 14,
    bookingPolicy:
      "Provisional holds are released automatically if a deposit is not received within the hold window.",
    cancellationNote:
      "Deposits are generally non-refundable; final cancellation terms are confirmed at booking and vary by property and season.",
  };
}

// ─── 4. Retrieval (live DB) ──────────────────────────────────────────────

async function fetchDestinations(supabase: ReturnType<typeof createAdminClient>): Promise<DestinationKnowledge[]> {
  const { data, error } = await supabase
    .from("destinations")
    .select("slug, name, description, highlights, seasons")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Knowledge: destinations fetch error", error);
    return [];
  }
  return (data || []).map((d) => ({
    slug: d.slug,
    name: d.name,
    description: d.description || "",
    highlights: Array.isArray(d.highlights) ? d.highlights : [],
    seasons: (Array.isArray(d.seasons) ? d.seasons : []).map((s) => ({
      name: (s as { name?: string }).name || "",
      months: (s as { months?: string }).months || "",
    })),
  }));
}

async function fetchProducts(supabase: ReturnType<typeof createAdminClient>): Promise<ProductKnowledge[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, slug, name, destination, location, tagline, description, price_range, rating, room_types, amenities, romantic_highlights")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    console.error("Knowledge: products fetch error", error);
    return [];
  }
  return (data || []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    destination: p.destination,
    location: p.location || "",
    tagline: p.tagline || undefined,
    description: p.description || undefined,
    priceRange: p.price_range || undefined,
    rating: Number(p.rating || 0),
    roomTypes: (Array.isArray(p.room_types) ? p.room_types : []) as ProductKnowledge["roomTypes"],
    amenities: Array.isArray(p.amenities) ? p.amenities : [],
    romanticHighlights: Array.isArray(p.romantic_highlights) ? p.romantic_highlights : [],
  }));
}

async function fetchPackages(supabase: ReturnType<typeof createAdminClient>): Promise<PackageKnowledge[]> {
  const { data, error } = await supabase
    .from("packages")
    .select("id, slug, title, subtitle, description, duration, price, destinations, inclusions")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Knowledge: packages fetch error", error);
    return [];
  }
  return (data || []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle || undefined,
    description: p.description || undefined,
    duration: p.duration || undefined,
    price: p.price || undefined,
    destinations: Array.isArray(p.destinations) ? p.destinations : [],
    inclusions: Array.isArray(p.inclusions) ? p.inclusions : [],
  }));
}

async function fetchExperiences(supabase: ReturnType<typeof createAdminClient>): Promise<KnowledgeContext["experiences"]> {
  const { data, error } = await supabase
    .from("experiences")
    .select("slug, title, description, category")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Knowledge: experiences fetch error", error);
    return [];
  }
  return (data || []).map((e) => ({
    slug: e.slug,
    title: e.title,
    description: e.description || "",
    category: e.category || "",
  }));
}

// ─── 5. Unified context assembly ──────────────────────────────────────────

/**
 * Assemble a full knowledge context that an agent can inject into an LLM
 * prompt (or read directly) to ground its response in Kivara's real brand,
 * catalog, and commercial rules. Optional `filter` narrows product/destination
 * knowledge to a specific destination or occasion (reduces token usage).
 */
export async function getKnowledgeContext(options?: {
  query?: string;
  destination?: string;
  limitProducts?: number;
}): Promise<KnowledgeContext> {
  const supabase = createAdminClient();

  const [destinations, products, packages, experiences] = await Promise.all([
    fetchDestinations(supabase),
    fetchProducts(supabase),
    fetchPackages(supabase),
    fetchExperiences(supabase),
  ]);

  let filteredDestinations = destinations;
  let filteredProducts = products;
  let filteredPackages = packages;
  if (options?.destination) {
    filteredDestinations = destinations.filter((d) => d.slug === options.destination);
    filteredProducts = products.filter((p) => p.destination === options.destination);
    filteredPackages = packages.filter((p) => p.destinations.includes(options.destination!));
  }
  if (options?.limitProducts && filteredProducts.length > options.limitProducts) {
    filteredProducts = filteredProducts.slice(0, options.limitProducts);
  }

  const brand = getBrandKnowledge();
  const commercial = getCommercialPolicy();

  const assembled = assembleContext({
    brand,
    commercial,
    query: options?.query,
    destinations: filteredDestinations,
    products: filteredProducts,
    packages: filteredPackages,
    experiences,
  });

  return {
    brand,
    commercial,
    query: options?.query,
    destinations: filteredDestinations,
    products: filteredProducts,
    packages: filteredPackages,
    experiences,
    assembled,
  };
}

function assembleContext(ctx: Omit<KnowledgeContext, "assembled">): string {
  const lines: string[] = [];

  lines.push(`# KIVARA KNOWLEDGE BASE`);
  lines.push(`Positioning: ${ctx.brand.positioning}`);
  lines.push(`Audience: ${ctx.brand.audience}`);
  lines.push("Value propositions:");
  for (const v of ctx.brand.valuePropositions) lines.push(`- ${v}`);
  lines.push("Voice guidelines:");
  for (const v of ctx.brand.voiceGuidelines) lines.push(`- ${v}`);
  lines.push("Signature experiences:");
  for (const s of ctx.brand.signatureExperiences) lines.push(`- ${s}`);

  lines.push("");
  lines.push(`# COMMERCIAL POLICY`);
  lines.push(`Currency: ${ctx.commercial.currency}`);
  lines.push(`Deposit: ${ctx.commercial.depositPercent}% of total`);
  lines.push(`Terms: ${ctx.commercial.paymentTerms}`);
  lines.push(`Quote validity: ${ctx.commercial.quoteValidityDays} days`);

  if (ctx.query) {
    lines.push("");
    lines.push(`# GUEST QUERY / CONTEXT`);
    lines.push(ctx.query);
  }

  if (ctx.destinations.length) {
    lines.push("");
    lines.push("# DESTINATIONS");
    for (const d of ctx.destinations) {
      lines.push(`## ${d.name} (${d.slug})`);
      if (d.description) lines.push(d.description);
      if (d.seasons.length) {
        lines.push(`Seasons: ${d.seasons.map((s) => `${s.name} (${s.months})`).join(", ")}`);
      }
      if (d.highlights.length) lines.push(`Highlights: ${d.highlights.join("; ")}`);
    }
  }

  if (ctx.products.length) {
    lines.push("");
    lines.push("# PROPERTIES / LODGES");
    for (const p of ctx.products) {
      const parts = [`## ${p.name}`, `Destination: ${p.destination}`, `Location: ${p.location}`];
      if (p.tagline) parts.push(`Tagline: ${p.tagline}`);
      if (p.description) parts.push(p.description);
      if (p.priceRange) parts.push(`Price range: ${p.priceRange}`);
      if (p.amenities.length) parts.push(`Amenities: ${p.amenities.join(", ")}`);
      if (p.romanticHighlights.length) parts.push(`Romantic highlights: ${p.romanticHighlights.join("; ")}`);
      lines.push(parts.join("\n"));
    }
  }

  if (ctx.packages.length) {
    lines.push("");
    lines.push("# CURATED PACKAGES");
    for (const p of ctx.packages) {
      const parts = [`## ${p.title}`, `Duration: ${p.duration || "n/a"}`, `From: ${p.price || "n/a"}`];
      if (p.subtitle) parts.push(p.subtitle);
      if (p.description) parts.push(p.description);
      if (p.inclusions.length) parts.push(`Inclusions: ${p.inclusions.join("; ")}`);
      lines.push(parts.join("\n"));
    }
  }

  if (ctx.experiences.length) {
    lines.push("");
    lines.push("# SIGNATURE EXPERIENCES CATALOG");
    for (const e of ctx.experiences) {
      lines.push(`- ${e.title} (${e.category}): ${e.description}`);
    }
  }

  return lines.join("\n");
}

// ─── 6. Keyword product search ────────────────────────────────────────────

/**
 * Lightweight keyword retrieval over the live product catalog. Scores products
 * by how well their name/location/amenities/description match the query.
 * Returns a ranked list. Suitable for agents that need a quick shortlist.
 */
export async function searchProducts(query: string, options?: { limit?: number; destination?: string }): Promise<ProductKnowledge[]> {
  const supabase = createAdminClient();
  const products = await fetchProducts(supabase);

  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);

  const scored = products
    .map((p) => {
      const haystack = [p.name, p.location, p.description, p.tagline || "", ...p.amenities, ...p.romanticHighlights]
        .join(" ")
        .toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (haystack.includes(term)) {
          score += p.name.toLowerCase().includes(term) ? 3 : 1;
        }
      }
      if (options?.destination && p.destination === options.destination) score += 2;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const limit = options?.limit || 5;
  return scored.slice(0, limit).map((x) => x.p);
}
