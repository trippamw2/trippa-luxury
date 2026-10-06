// ─── Kivara AI Journey Curation Engine (Brand Voice) ─────────────────────
// Rule-based journey builder that matches guest profiles to properties,
// generates day-by-day itineraries, and calculates pricing.
// All guest-facing prose uses the KIVARA brand vocabulary and tone.

import { PROPERTIES, DESTINATIONS } from "../constants";
import type {
  GuestProfile,
  CuratedJourney,
  JourneyDay,
  JourneyPricing,
  Activity,
  Transfer,
  JourneyAlternative,
} from "./types";
import { callLlmJson, type LlmMessage } from "./llm";
import { getKnowledgeContext, getActiveProducts, type ProductKnowledge } from "./knowledge";
import { wrapDocument, documentHeader, documentBody, documentFooter, refBox, infoGrid, KIVARA_BRAND } from "../documents/template";

// ── Property shape ─────────────────────────────────────────────────────
/**
 * The subset of a property this engine actually reads.
 *
 * Declared deliberately small rather than as `(typeof PROPERTIES)[number]`,
 * because the engine now needs to accept properties from two producers that
 * satisfy different shapes: the live catalog rows (`ProductKnowledge`, uuid ids
 * and object room entries) and the legacy `constants.ts` array. Both are
 * assignable to this, so pricing, scoring and transfer logic stay unchanged and
 * nobody has to cast one into the other's type.
 */
export interface JourneyProperty {
  /** Stable slug, e.g. "kaya-mawa". Drives destination and airport resolution. */
  id: string;
  name: string;
  /** Destination slug: "lake-malawi" | "south-luangwa" | "zanzibar". */
  destination: string;
  location: string;
  tagline: string;
  description: string;
  priceRange: string;
  rating: number;
  heroImage: string;
  amenities: string[];
  roomTypes: string[];
  romanticHighlights: string[];
}

function toStringArray(values: unknown[]): string[] {
  return values.filter((v): v is string => typeof v === "string" && v.length > 0);
}

/**
 * Adapt a live catalog row into the engine's property shape.
 *
 * The important detail is `id: product.slug`: the DB id is a uuid, but transfer
 * and park-fee resolution both key off the slug. Using the uuid here would make
 * every live property fall through `getDestIdForProperty`'s fallback and be
 * priced as if it were on Lake Malawi.
 */
function toJourneyProperty(product: ProductKnowledge): JourneyProperty {
  return {
    id: product.slug,
    name: product.name,
    destination: product.destination,
    location: product.location,
    tagline: product.tagline ?? "",
    description: product.description ?? "",
    priceRange: product.priceRange ?? "",
    rating: product.rating,
    heroImage: product.heroImage ?? "",
    amenities: toStringArray(product.amenities),
    // Live rows carry object room entries (`{ name, sleeps, description }`);
    // the engine's scoring reads room names as strings.
    roomTypes: toStringArray(product.roomTypes.map((room) => room?.name)),
    romanticHighlights: toStringArray(product.romanticHighlights),
  };
}

// ── Live catalog cache ────────────────────────────────────────────────
/**
 * Sellable properties loaded from the DB, or null until something loads them.
 *
 * The rule-based path used to read `constants.ts` directly, which meant an
 * operator activating or deactivating a row in `/admin/properties` had no
 * effect on it — the LLM prompt showed the live catalog while pricing and
 * selection kept using the hardcoded mirror, and the two drifted apart the
 * first time anyone edited a property.
 *
 * Null (not primed) falls back to `PROPERTIES`, so every sync caller keeps
 * working before a warm happens and tests can exercise either source.
 */
let liveCatalog: JourneyProperty[] | null = null;

/**
 * Point the engine at a set of catalog rows. Empty fetches are ignored: a
 * failed `properties` read also yields `[]`, and letting that wipe a good
 * cache would silently resurrect the hardcoded mirror mid-process. A
 * genuinely empty catalog is caught where it matters — `llmGenerate()` throws
 * before it builds a prompt with nothing to sell.
 */
export function primeLiveCatalog(products: ProductKnowledge[]): void {
  if (products.length === 0) return;
  liveCatalog = products.map(toJourneyProperty);
}

/** Properties the rule-based path may select from. */
function activeProperties(): JourneyProperty[] {
  return liveCatalog ?? PROPERTIES;
}

/** Drop both module caches. Production never calls this; tests need it so
 * one test's warm cannot leak into the next assertion. */
export function resetJourneyEngineCaches(): void {
  liveCatalog = null;
  transferPricingCache = null;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function generateId(): string {
  return `JRN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function pick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── Brand-aware Labels ───────────────────────────────────────────────

const STYLE_TITLES: Record<string, string> = {
  romantic: "A Romantic African Sojourn",
  adventure: "A Safari Beyond the Ordinary",
  relaxation: "Stillness & Serenity by the Shore",
  cultural: "A Journey Through Africa's Soul",
  mixed: "A Curated Bush & Beach Journey",
};

const COUPLE_TITLES: Record<string, string> = {
  romantic: "A Romance Written in the Stars",
  relaxation: "A Lovers' Retreat",
  adventure: "A Shared Safari",
  cultural: "A Journey of Discovery, Together",
  mixed: "An African Romance, Bush to Beach",
};

const ACCOMMODATION_BRAND: Record<string, string> = {
  "intimate-boutique": "an intimate sanctuary",
  "luxury-resort": "a grand retreat",
  "eco-camp": "a wilderness haven",
  "private-villa": "your private escape",
};

const ACTIVITY_SENSORY: Record<string, string> = {
  safari: "The golden light of dawn spills across the plains as the bush stirs to life : a quiet communion with the wild",
  "water-sports": "The lake shimmers in the midday sun, inviting you into its crystalline embrace",
  cultural: "The rhythm of an ancient culture unfolds before you, whispered through song, dance, and story",
  spa: "Stillness descends as skilled hands work away the residue of the world beyond",
  dining: "Under a canopy of stars, dinner becomes a ceremony : each course a celebration of place",
  relaxation: "Time slows. The world recedes. You surrender to the gentle rhythm of Africa",
  adventure: "The path less travelled beckons :每一步 a discovery, every vista a revelation",
  wellness: "Breathe. Stretch. Surrender. Here, wellness is not an activity but a way of being",
  other: "A moment crafted to linger in memory",
};

// ── Matching Logic ──────────────────────────────────────────────────────

function scorePropertyForGuest(
  property: JourneyProperty,
  guest: GuestProfile
): number {
  let score = 0;
  const prefs = guest.preferences;

  if (prefs.travelStyle === "romantic" || prefs.travelStyle === "relaxation") {
    if (property.romanticHighlights && property.romanticHighlights.length > 0) score += 20;
    if (property.tagline?.toLowerCase().includes("romance") || property.tagline?.toLowerCase().includes("love")) score += 15;
  }
  if (prefs.travelStyle === "adventure") {
    const adventureActivities = ["safari", "walking", "kayaking", "snorkelling", "diving", "game drive"];
    const acts = property.amenities?.map((a) => a.toLowerCase()) ?? [];
    const matchCount = adventureActivities.filter((a) => acts.some((am) => am.includes(a))).length;
    score += matchCount * 5;
  }

  if (prefs.accommodationStyle === "eco-camp") {
    if (property.roomTypes?.some((r) => r.toLowerCase().includes("tent"))) score += 15;
    if (property.amenities?.some((a) => a.toLowerCase().includes("eco") || a.toLowerCase().includes("solar"))) score += 10;
  }
  if (prefs.accommodationStyle === "luxury-resort") {
    if (property.roomTypes?.some((r) => r.toLowerCase().includes("villa") || r.toLowerCase().includes("suite"))) score += 15;
    if (property.amenities?.some((a) => a.toLowerCase().includes("spa") || a.toLowerCase().includes("butler"))) score += 10;
  }
  if (prefs.accommodationStyle === "intimate-boutique") {
    if (property.priceRange?.includes("500")) score += 10;
    if (property.roomTypes && property.roomTypes.length <= 4) score += 10;
  }

  if (prefs.activityLevel === "high") {
    const highEnergy = ["safari", "walking", "diving", "kayaking", "cycling", "tennis", "water-skiing"];
    const acts = property.amenities?.map((a) => a.toLowerCase()) ?? [];
    const matchCount = highEnergy.filter((a) => acts.some((am) => am.includes(a))).length;
    score += matchCount * 3;
  }
  if (prefs.activityLevel === "low") {
    const lowEnergy = ["spa", "pool", "dining", "library", "yoga"];
    const acts = property.amenities?.map((a) => a.toLowerCase()) ?? [];
    const matchCount = lowEnergy.filter((a) => acts.some((am) => am.includes(a))).length;
    score += matchCount * 3;
  }

  if (guest.isCouple) {
    if (property.romanticHighlights && property.romanticHighlights.length > 0) score += 15;
  }

  return score;
}

function selectProperties(
  guest: GuestProfile,
  destinationId: string,
  count: number = 2
): JourneyProperty[] {
  const dest = DESTINATIONS.find((d) => d.id === destinationId);
  if (!dest) return [];

  // Filtered by the property's own `destination` field rather than
  // `dest.properties`: that list is a hardcoded snapshot in `constants.ts`, so
  // a row an operator activates later would never appear in it even when the
  // DB says it is sellable.
  const available = activeProperties().filter((p) => p.destination === destinationId);
  const scored = available.map((p) => ({ property: p, score: scorePropertyForGuest(p, guest) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.property);
}

// ── Duration Recommendation ─────────────────────────────────────────────

function recommendNights(destinationId: string, activityLevel: string): number {
  const base: Record<string, number> = {
    "lake-malawi": 3,
    "south-luangwa": 3,
    zanzibar: 4,
  };
  const extra = activityLevel === "high" ? 1 : activityLevel === "low" ? 0 : 0;
  return (base[destinationId] ?? 3) + extra;
}

// ── Activity Generation (Brand Voice) ─────────────────────────────────

function generateActivities(
  property: JourneyProperty,
  guest: GuestProfile,
  dayType: "arrival" | "full" | "departure"
): Activity[] {
  const acts: Activity[] = [];
  const ambiance = ACCOMMODATION_BRAND[guest.preferences.accommodationStyle] || "a thoughtfully chosen haven";

  if (dayType === "arrival") {
    acts.push({
      time: "Afternoon",
      title: "Arrival & Welcome",
      description: `Arrive at ${property.name}, ${ambiance} in the heart of ${property.location}. A welcome awaits : cool towels, a gentle orientation, and the first breath of your new surroundings.`,
      duration: "2 hours",
      included: true,
      type: "relaxation",
    });
    if (guest.isCouple) {
      acts.push({
        time: "Evening",
        title: "Welcome Dinner",
        description: `A private dinner at ${property.name} : the first of many evenings where cuisine becomes ceremony, and the African night enfolds you.`,
        duration: "2 hours",
        included: true,
        type: "dining",
      });
    } else {
      acts.push({
        time: "Evening",
        title: "Evening Orientation",
        description: `Settle in with a sundowner as your concierge walks you through the days ahead : a gentle beginning to your journey.`,
        duration: "1 hour",
        included: true,
        type: "dining",
      });
    }
    return acts;
  }

  if (dayType === "departure") {
    acts.push({
      time: "Morning",
      title: "Final Breakfast",
      description: "One last morning in this place. Breakfast lingers as you absorb the atmosphere : a quiet farewell before your next chapter.",
      duration: "1.5 hours",
      included: true,
      type: "dining",
    });
    return acts;
  }

  // Full day
  if (guest.preferences.activityLevel === "high") {
    acts.push({
      time: "Morning",
      title: "Morning Exploration",
      description: ACTIVITY_SENSORY.safari,
      duration: "4 hours",
      included: true,
      type: "safari",
    });
    acts.push({
      time: "Afternoon",
      title: "Leisure & Reflection",
      description: ACTIVITY_SENSORY.relaxation,
      duration: "3 hours",
      included: true,
      type: "relaxation",
    });
    if (guest.isCouple) {
      acts.push({
        time: "Evening",
        title: "Sundowners & Stargazing",
        description: ACTIVITY_SENSORY.dining,
        duration: "2 hours",
        included: true,
        type: "dining",
      });
    }
  } else {
    acts.push({
      time: "Morning",
      title: "A Slow Morning",
      description: ACTIVITY_SENSORY.relaxation,
      duration: "3 hours",
      included: true,
      type: "relaxation",
    });
    acts.push({
      time: "Afternoon",
      title: "A Curated Encounter",
      description: guest.preferences.travelStyle === "cultural"
        ? ACTIVITY_SENSORY.cultural
        : ACTIVITY_SENSORY["water-sports"],
      duration: "3 hours",
      included: true,
      type: guest.preferences.travelStyle === "cultural" ? "cultural" : "adventure",
    });
    acts.push({
      time: "Evening",
      title: "Dinner Under the Stars",
      description: ACTIVITY_SENSORY.dining,
      duration: "2 hours",
      included: true,
      type: "dining",
    });
  }

  return acts;
}

// ── Airport & Transfer Data ────────────────────────────────────────────

const AIRPORTS: Record<string, {
  pointOfEntry: { name: string; code: string }[];
  local: { name: string; code: string; propertyIds: string[] }[];
}> = {
  "lake-malawi": {
    pointOfEntry: [
      { name: "Kamuzu International Airport", code: "LLW" },
      { name: "Chileka International Airport", code: "BLZ" },
    ],
    local: [
      { name: "Likoma Airport", code: "LIX", propertyIds: ["kaya-mawa"] },
      { name: "Makokola Airfield", code: "MAK", propertyIds: ["makokola-retreat", "pumulani-lodge"] },
    ],
  },
  "south-luangwa": {
    pointOfEntry: [
      { name: "Kenneth Kaunda International Airport", code: "LUN" },
      { name: "Kamuzu International Airport", code: "LLW" },
    ],
    local: [
      { name: "Mfuwe International Airport", code: "MFU", propertyIds: ["chinzombo", "puku-ridge-camp"] },
    ],
  },
  zanzibar: {
    pointOfEntry: [
      { name: "Abeid Amani Karume International Airport", code: "ZNZ" },
    ],
    local: [
      { name: "Abeid Amani Karume International Airport", code: "ZNZ", propertyIds: ["xanadu-villas", "baraza-resort-spa"] },
    ],
  },
};

function getLocalAirport(propertyId: string, destId: string): { name: string; code: string } {
  const destAirports = AIRPORTS[destId];
  if (!destAirports) return { name: "Local Airport", code: "---" };
  const found = destAirports.local.find((a) => a.propertyIds.includes(propertyId));
  return found || destAirports.local[0] || { name: "Local Airport", code: "---" };
}

function getPointOfEntry(destId: string): { name: string; code: string } {
  const destAirports = AIRPORTS[destId];
  return destAirports?.pointOfEntry[0] || { name: "International Airport", code: "---" };
}

/**
 * Which destination a property sits in — drives airport choice, charter cost
 * and whether South Luangwa park fees apply.
 *
 * The property's own `destination` field is authoritative. It is present on
 * every live row and on every `constants.ts` row, and unlike the old
 * `AIRPORTS` `propertyIds` scan it does not silently return `lake-malawi` for
 * any property nobody happened to hardcode — which would have quoted Zanzibar
 * and Luangwa itineraries with the wrong airport and no park fees. The
 * "lake-malawi" default now only covers a row that has no destination at all.
 */
function getDestIdForProperty(property: JourneyProperty): string {
  return property.destination || "lake-malawi";
}

// ── Transfer Generation ────────────────────────────────────────────────
// Pricing constants (per person, based on actual supplier rates 2025)
// Sources: Sky Trails Zambia, Proflight Zambia, Coastal Aviation
const CHARTER_COSTS: Record<string, number> = {
  "lake-malawi_south-luangwa": 1850,   // Lilongwe → Mfuwe (1hr flight, ~$2,500-3,040 per aircraft)
  "south-luangwa_zanzibar": 1450,       // Mfuwe → Zanzibar (2.5hr flight, ~$3,500 per aircraft)
  "lake-malawi_zanzibar": 1650,         // Lilongwe → Zanzibar (1.5hr flight, ~$4,000 per aircraft)
  "lake-malawi_lake-malawi": 450,       // Likoma → Club Makokola airstrip (~30min)
  "south-luangwa_south-luangwa": 350,   // Mfuwe → Mfuwe internal (~30min)
};
const DEFAULT_CHARTER_COST = 850;
const ROAD_TRANSFER_COST = 120;          // Private vehicle with refreshments
const EXIT_CHARTER_COST = 750;           // Local airstrip → international hub
const PARK_FEES_PER_DAY = 120;           // South Luangwa park fees per person per day

/**
 * Operator-editable transfer pricing.
 *
 * Every field here has a matching input on `/admin/settings`. Before this
 * wiring existed those inputs wrote a `platform_settings` row that nothing
 * read, and the journey engine always quoted the hardcoded 2025 supplier rates
 * above — so the admin copy claiming transfer pricing feeds the AI journey
 * engine was untrue.
 */
export interface TransferPricing {
  charterCosts: Record<string, number>;
  defaultCharterCost: number;
  roadTransferCost: number;
  exitCharterCost: number;
  parkFeesPerDay: number;
}

const DEFAULT_TRANSFER_PRICING: TransferPricing = {
  charterCosts: { ...CHARTER_COSTS },
  defaultCharterCost: DEFAULT_CHARTER_COST,
  roadTransferCost: ROAD_TRANSFER_COST,
  exitCharterCost: EXIT_CHARTER_COST,
  parkFeesPerDay: PARK_FEES_PER_DAY,
};

/**
 * Last value read from `platform_settings`, or null before any successful read.
 *
 * Held in module scope rather than passed as a parameter because pricing is
 * computed deep inside synchronous helpers (`calculatePricing`,
 * `generateAirTransfer`, `generateRoadLeg`) that are also reached from the
 * synchronous rule-based fallback. Threading it through would change
 * `generate()`'s signature, which `proposal-engine` and `quote-engine` both
 * call synchronously.
 *
 * An unwarmed caller gets `DEFAULT_TRANSFER_PRICING`, which is identical to
 * what this code shipped with before — so a missed warm degrades to today's
 * numbers, never to a wrong price.
 */
let transferPricingCache: TransferPricing | null = null;

/**
 * Read transfer pricing from `platform_settings`. Idempotent and never throws.
 *
 * On failure the cache is deliberately left null so the next request retries,
 * rather than pinning the hardcoded defaults for the life of the process.
 */
async function warmTransferPricing(): Promise<TransferPricing> {
  if (transferPricingCache) return transferPricingCache;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("platform_settings").select("key, value");
    if (error) throw error;
    const map: Record<string, string> = {};
    (data || []).forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });

    transferPricingCache = {
      charterCosts: {
        "lake-malawi_south-luangwa": Number(map.charter_lby_mfu) || 1850,
        "south-luangwa_zanzibar": Number(map.charter_mfu_znz) || 1450,
        "lake-malawi_zanzibar": Number(map.charter_lby_znz) || 1650,
        "lake-malawi_lake-malawi": Number(map.charter_internal) || 450,
        "south-luangwa_south-luangwa": Number(map.charter_internal) || 350,
      },
      defaultCharterCost: 850,
      roadTransferCost: Number(map.road_transfer) || 120,
      exitCharterCost: Number(map.exit_charter) || 750,
      parkFeesPerDay: Number(map.park_fees_per_day) || 120,
    };
  } catch {
    // Keep the hardcoded supplier rates and let the next request retry.
  }
  return transferPricingCache ?? DEFAULT_TRANSFER_PRICING;
}

/** Pricing to quote with right now: the warmed override, or the defaults. */
function transferPricing(): TransferPricing {
  return transferPricingCache ?? DEFAULT_TRANSFER_PRICING;
}

/**
 * Load everything the engines need from live business data, then let any
 * synchronous caller price without waiting on a network.
 *
 * Two things are warmed, and both matter for the same reason — the admin
 * panel presents them as editable, so what an operator types has to be what a
 * guest is quoted:
 *
 * 1. Transfer/charter/park-fee rates from `platform_settings`.
 * 2. The active property catalog, so the rule-based path (the fallback when
 *    the LLM is down, and what `quote-engine` calls directly) selects and
 *    prices the rows an operator has actually published rather than the
 *    `constants.ts` mirror.
 *
 * Idempotent, never throws, and each half degrades to the previously shipped
 * hardcoded values on failure — a broken database must not break quoting.
 * `llmGenerate()` re-primes the catalog from the knowledge context it already
 * fetched, so the LLM path pays for no extra query.
 */
export async function warmJourneyInputs(): Promise<void> {
  await Promise.all([warmTransferPricing(), warmCatalog()]);
}

/**
 * Prime the live catalog from the DB. Skipped when something has already
 * primed it (the knowledge context path, or an earlier warm in this process).
 */
async function warmCatalog(): Promise<void> {
  if (liveCatalog) return;
  try {
    primeLiveCatalog(await getActiveProducts());
  } catch {
    // Stay on the constants mirror and let the next warm retry.
  }
}

/** Generate an air transfer (charter flight) between two airports */
function generateAirTransfer(
  fromName: string,
  fromCode: string,
  toName: string,
  toCode: string,
  routeKey: string,
  isEntry: boolean,
  isExit: boolean,
): Transfer {
  const pricing = transferPricing();
  const cost = isExit
    ? pricing.exitCharterCost
    : pricing.charterCosts[routeKey] || pricing.defaultCharterCost;

  if (isEntry) {
    return {
      from: fromName,
      to: `${toName} (${toCode})`,
      mode: "flight",
      duration: "~45 to 60 minutes",
      cost,
      notes: `Private charter from ${fromCode} to ${toCode}. VIP meet-and-greet upon arrival.`,
    };
  }

  if (isExit) {
    return {
      from: `${fromName} (${fromCode})`,
      to: `${toName} (${toCode}) : International Departure`,
      mode: "flight",
      duration: "~45 to 60 minutes",
      cost,
      notes: `Private charter from ${fromCode} to ${toCode} for international connection.`,
    };
  }

  // Cross-destination charter
  const durationMap: Record<string, string> = {
    "lake-malawi_south-luangwa": "~2 hours",
    "south-luangwa_zanzibar": "~3 hours",
    "lake-malawi_zanzibar": "~2.5 hours",
  };
  return {
    from: `${fromName} (${fromCode})`,
    to: `${toName} (${toCode})`,
    mode: "flight",
    duration: durationMap[routeKey] || "~2.5 hours",
    cost,
    notes: "Private air charter between destinations. All ground transfers included.",
  };
}

/** Generate a road transfer (pickup/dropoff) between a local airport and a property */
function generateRoadLeg(
  airportName: string,
  airportCode: string,
  propertyName: string,
  direction: "pickup" | "dropoff"
): Transfer {
  return {
    from: direction === "pickup"
      ? `${airportName} (${airportCode})`
      : propertyName,
    to: direction === "pickup"
      ? propertyName
      : `${airportName} (${airportCode})`,
    mode: "road",
    duration: "~30 to 45 minutes",
    cost: transferPricing().roadTransferCost,
    notes: direction === "pickup"
      ? "Private safari vehicle with refreshments. Driver will greet you at arrivals."
      : "Private vehicle transfer to the airstrip for your departure charter.",
  };
}

/** Build all transfers for a single-leg arrival into a property */
function buildArrivalTransfers(
  index: number,
  currentDestId: string,
  currentPropertyId: string,
  currentPropertyName: string,
  prevDestId: string | null,
  prevPropertyId: string | null,
): Transfer[] {
  const currentLocal = getLocalAirport(currentPropertyId, currentDestId);
  const transfers: Transfer[] = [];

  if (index === 0) {
    // First property: international entry → local airstrip
    const poe = getPointOfEntry(currentDestId);
    const isSame = poe.name === currentLocal.name;
    if (!isSame) {
      transfers.push(generateAirTransfer(
        `${poe.name} (${poe.code}) : International Arrival`,
        poe.code,
        currentLocal.name,
        currentLocal.code,
        `entry_${currentDestId}`,
        true,   // isEntry
        false,  // isExit
      ));
    }
  } else if (prevDestId && prevPropertyId) {
    // Cross-destination or same-destination: previous local → current local
    const prevLocal = getLocalAirport(prevPropertyId, prevDestId);
    const routeKey = `${prevDestId}_${currentDestId}`;
    const isSameDest = prevDestId === currentDestId;

    if (isSameDest && prevLocal.code === currentLocal.code) {
      // Same local airport → just a road transfer
      transfers.push(generateRoadLeg(
        currentLocal.name, currentLocal.code,
        currentPropertyName, "pickup",
      ));
      return transfers;
    }

    // Air transfer between airports
    transfers.push(generateAirTransfer(
      prevLocal.name, prevLocal.code,
      currentLocal.name, currentLocal.code,
      routeKey,
      false,  // isEntry
      false,  // isExit
    ));
  }

  // Road leg: local airport → property (always present after air transfer)
  transfers.push(generateRoadLeg(
    currentLocal.name, currentLocal.code,
    currentPropertyName, "pickup",
  ));

  return transfers;
}

/** Build departure transfers from the last property */
function buildDepartureTransfers(
  destId: string,
  propertyId: string,
  propertyName: string,
): Transfer[] {
  const local = getLocalAirport(propertyId, destId);
  const poe = getPointOfEntry(destId);
  const isSame = local.name === poe.name;
  const transfers: Transfer[] = [];

  // Road leg: property → local airport
  transfers.push(generateRoadLeg(
    local.name, local.code,
    propertyName, "dropoff",
  ));

  // Charter leg: local airport → international point of entry (if different)
  if (!isSame) {
    transfers.push(generateAirTransfer(
      local.name, local.code,
      poe.name, poe.code,
      `${destId}_exit`,
      false,  // isEntry
      true,   // isExit
    ));
  }

  return transfers;
}

// ── Pricing Calculation ────────────────────────────────────────────────

/** Extract the maximum per-person-per-night price from a priceRange string.
 *  Handles formats: "$X to $Y", "$X to $Y (text)", "From $X", and bare "$X".
 *  Falls back to a default if parsing fails.
 */
function extractMaxPppn(priceRange: string): number {
  // Strip parenthetical notes first (e.g. "(park fees additional $120pppn)")
  const cleaned = priceRange.replace(/\([^)]*\)/g, "");
  // Try "$X to $Y" format → return Y
  const rangeMatch = cleaned.match(/\$([\d,]+)\s*to\s*\$([\d,]+)/i);
  if (rangeMatch) {
    return parseInt(rangeMatch[2].replace(/,/g, ""));
  }
  // Try "From $X" format → return X
  const fromMatch = cleaned.match(/from\s*\$?([\d,]+)/i);
  if (fromMatch) {
    return parseInt(fromMatch[1].replace(/,/g, ""));
  }
  // Fallback: grab the first dollar figure
  const fallback = cleaned.match(/\$?([\d,]+)/);
  return fallback ? parseInt(fallback[1].replace(/,/g, "")) : 600;
}

const PPPN_MARKUP = 0.45; // 45% margin added to every property's PPPN

function calculatePricing(
  propertyAssignments: { property: JourneyProperty; nights: number }[],
  guest: GuestProfile
): JourneyPricing {
  const accommodation: JourneyPricing["accommodation"] = [];
  let subtotal = 0;

  const guestCount = guest.isCouple ? 2 : 1;
  const pricing = transferPricing();

  for (const { property, nights } of propertyAssignments) {
    // 1. Extract the maximum seasonal PPPN price
    const baseRate = extractMaxPppn(property.priceRange || "");
    // 2. Apply 45% universal markup
    const rateAfterMarkup = Math.round(baseRate * (1 + PPPN_MARKUP));
    // 3. Ultra-luxury guests get an additional premium tier on top
    const effectivePPPN = guest.preferences.budgetRange === "ultra-luxury"
      ? Math.round(rateAfterMarkup * 1.25)
      : rateAfterMarkup;
    // 4. Per-night = PPPN × number of guests (couple = 2, solo = 1)
    const ratePerNight = effectivePPPN * guestCount;
    const subtotalRow = ratePerNight * nights;
    accommodation.push({
      label: property.name,
      nights,
      ratePerNight,
      ratePerNightPPPN: effectivePPPN,
      subtotal: subtotalRow,
    });
    subtotal += subtotalRow;
  }

  // Calculate transfer costs (per person) for the full itinerary
  let transferTotal = 0;
  for (let i = 0; i < propertyAssignments.length; i++) {
    const { property } = propertyAssignments[i];
    const curDestId = getDestIdForProperty(property);

    // Arrival transfers
    const prevProp = i > 0 ? propertyAssignments[i - 1] : null;
    const prevDestId = prevProp ? getDestIdForProperty(prevProp.property) : null;
    const prevPropId = prevProp ? prevProp.property.id : null;

    if (i === 0) {
      const poe = getPointOfEntry(curDestId);
      const local = getLocalAirport(property.id, curDestId);
      if (poe.name !== local.name) transferTotal += pricing.defaultCharterCost;
      transferTotal += pricing.roadTransferCost;
    } else if (prevDestId && prevPropId) {
      const prevLocal = getLocalAirport(prevPropId, prevDestId);
      const curLocal = getLocalAirport(property.id, curDestId);
      if (prevDestId !== curDestId || prevLocal.code !== curLocal.code) {
        const routeKey = `${prevDestId}_${curDestId}`;
        transferTotal += pricing.charterCosts[routeKey] || pricing.defaultCharterCost;
      }
      transferTotal += pricing.roadTransferCost;
    }
  }

  // Last property departure
  if (propertyAssignments.length > 0) {
    const last = propertyAssignments[propertyAssignments.length - 1];
    const lastDestId = getDestIdForProperty(last.property);
    const lastLocal = getLocalAirport(last.property.id, lastDestId);
    const lastPoe = getPointOfEntry(lastDestId);
    transferTotal += pricing.roadTransferCost; // property → local airport
    if (lastLocal.name !== lastPoe.name) transferTotal += pricing.exitCharterCost; // local → international
  }

  // Calculate park fees (South Luangwa charges $120pppn)
  let parkFeesTotal = 0;
  for (const { property, nights } of propertyAssignments) {
    const destId = getDestIdForProperty(property);
    if (destId === "south-luangwa") {
      parkFeesTotal += pricing.parkFeesPerDay * nights * guestCount;
    }
  }

  // Multiply by guest count (each guest pays for transfers)
  const transferTotalGuests = transferTotal * guestCount;
  subtotal += transferTotalGuests;
  subtotal += parkFeesTotal;

  const taxes = Math.round(subtotal * 0.1);
  const total = subtotal + taxes;

  return {
    accommodation,
    activities: [],
    transfers: [
      { label: "All private charters & road transfers", cost: transferTotalGuests },
      ...(parkFeesTotal > 0 ? [{ label: `South Luangwa National Park fees ($${pricing.parkFeesPerDay}pppn)`, cost: parkFeesTotal }] : []),
    ],
    subtotal,
    taxes,
    total,
    currency: "USD",
  };
}

// ── Journey Builder ─────────────────────────────────────────────────────

export class JourneyEngine {
  generate(guest: GuestProfile): CuratedJourney {
    // Normalize the profile so callers may pass a partial object (e.g. an
    // admin-curated quote with only name/email/preferences). Missing optional
    // fields fall back to safe defaults instead of crashing downstream.
    const prefsDefaults = {
      travelStyle: "romantic" as const,
      accommodationStyle: "luxury-resort" as const,
      activityLevel: "moderate" as const,
      budgetRange: "premium" as const,
    };
    guest = {
      ...guest,
      desiredNights: guest.desiredNights ?? 7,
      preferences: { ...prefsDefaults, ...(guest.preferences ?? {}) },
    };

    // Use explicit destination assignments if provided, otherwise auto-select
    const hasExplicit = guest.explicitDestinations && guest.explicitDestinations.length > 0;

    let selectedDestinations: string[];
    let propertyAssignments: { property: JourneyProperty; nights: number }[];

    if (hasExplicit) {
      // Use explicit destination/property/nights from user
      selectedDestinations = guest.explicitDestinations!.map((d) => d.destinationId);
      propertyAssignments = [];
      for (const assign of guest.explicitDestinations!) {
        let props: JourneyProperty[];
        if (assign.propertyId) {
          // Specific property requested
          const found = activeProperties().find((p) => p.id === assign.propertyId);
          props = found ? [found] : selectProperties(guest, assign.destinationId, 1);
        } else {
          props = selectProperties(guest, assign.destinationId, 1);
        }
        for (const p of props) {
          propertyAssignments.push({ property: p, nights: assign.nights });
        }
      }
    } else {
      // Auto-select destinations based on travel style
      const allDestinations = DESTINATIONS.map((d) => d.id);
      selectedDestinations = guest.preferences.travelStyle === "relaxation"
        ? ["lake-malawi", "zanzibar"]
        : guest.preferences.travelStyle === "adventure"
          ? ["south-luangwa"]
          : allDestinations;

      // Calculate nights per destination
      const destNights = selectedDestinations.map((destId) => ({
        destId,
        base: recommendNights(destId, guest.preferences.activityLevel),
      }));
      const totalBase = destNights.reduce((s, d) => s + d.base, 0);
      const targetNights = guest.desiredNights || totalBase;

      // Distribute nights proportionally, ensure minimum 2 per destination
      const allocated = destNights.map((d) => Math.max(2, Math.round((d.base / totalBase) * targetNights)));
      const allocatedTotal = allocated.reduce((s, n) => s + n, 0);
      let diff = targetNights - allocatedTotal;
      while (diff !== 0) {
        if (diff > 0) {
          const maxIdx = allocated.indexOf(Math.max(...allocated));
          allocated[maxIdx]++;
          diff--;
        } else {
          const minIdx = allocated.indexOf(Math.min(...allocated));
          if (allocated[minIdx] > 2) { allocated[minIdx]--; diff++; }
          else break;
        }
      }

      propertyAssignments = [];
      for (let i = 0; i < destNights.length; i++) {
        const props = selectProperties(guest, destNights[i].destId, 1);
        for (const p of props) {
          propertyAssignments.push({ property: p, nights: allocated[i] });
        }
      }
    }

    const itinerary: JourneyDay[] = [];
    let dayCounter = 1;

    for (let i = 0; i < propertyAssignments.length; i++) {
      const { property, nights } = propertyAssignments[i];
      const location = property.location || property.destination;
      const currentDestId = getDestIdForProperty(property);

      // Build arrival transfers (charter + road pickup)
      const prevDestId = i > 0 ? getDestIdForProperty(propertyAssignments[i - 1].property) : null;
      const prevPropertyId = i > 0 ? propertyAssignments[i - 1].property.id : null;
      const arrivalTransfers = buildArrivalTransfers(
        i, currentDestId, property.id, property.name,
        prevDestId, prevPropertyId,
      );

      itinerary.push({
        day: dayCounter,
        title: `Arrive at ${property.name}`,
        location,
        accommodation: property.name,
        accommodationImage: property.heroImage,
        meals: ["Dinner"],
        activities: generateActivities(property, guest, "arrival"),
        transfers: arrivalTransfers,
        highlights: [`Welcome to ${property.name}`, property.tagline].filter(Boolean) as string[],
      });
      dayCounter++;

      // Full days
      for (let n = 1; n <= nights; n++) {
        const isLastNight = n === nights;
        itinerary.push({
          day: dayCounter,
          title: isLastNight ? `Farewell to ${property.name}` : `Explore ${location}`,
          location,
          accommodation: property.name,
          accommodationImage: property.heroImage,
          meals: isLastNight ? ["Breakfast", "Lunch", "Dinner"] : ["Breakfast", "Lunch", "Dinner"],
          activities: generateActivities(property, guest, isLastNight ? "departure" : "full"),
          transfers: [],
          highlights: isLastNight
            ? ["A final evening to savour", "Last chance to absorb the atmosphere"]
            : (property.romanticHighlights ? pick(property.romanticHighlights, 2) : ["A day of curated experiences"]),
        });
        dayCounter++;
      }
    }

    // Add departure transfers on the last day (road dropoff + charter to international)
    if (propertyAssignments.length > 0) {
      const lastPA = propertyAssignments[propertyAssignments.length - 1];
      const lastDestId = getDestIdForProperty(lastPA.property);
      const lastDayIdx = itinerary.length - 1;
      const departureTransfers = buildDepartureTransfers(lastDestId, lastPA.property.id, lastPA.property.name);
      itinerary[lastDayIdx].transfers.push(...departureTransfers);
    }

    const pricing = calculatePricing(propertyAssignments, guest);

    const highlights: string[] = [];
    for (const pa of propertyAssignments) {
      const dest = DESTINATIONS.find((d) => d.properties.includes(pa.property.id));
      if (dest) highlights.push(`${pa.nights} nights at ${pa.property.name} in ${dest.title}`);
      if (pa.property.romanticHighlights) {
        highlights.push(pa.property.romanticHighlights[0]);
      }
    }

    // Brand-aligned journey title
    const title = guest.isCouple
      ? COUPLE_TITLES[guest.preferences.travelStyle] || COUPLE_TITLES.mixed
      : STYLE_TITLES[guest.preferences.travelStyle] || STYLE_TITLES.mixed;

    const destNames = selectedDestinations
      .map((id) => DESTINATIONS.find((d) => d.id === id)?.title || id)
      .join(", ");

    return {
      id: generateId(),
      title,
      subtitle: `${selectedDestinations.length} destinations · ${propertyAssignments.reduce((s, p) => s + p.nights, 0)} nights · ${destNames}`,
      guestProfile: guest,
      destinations: selectedDestinations,
      duration: propertyAssignments.reduce((s, p) => s + p.nights, 0),
      pricing,
      itinerary,
      highlights,
      includedExtras: [
        "All accommodation and daily dining",
        "Private transfers throughout your journey",
        "Curated experiences as per itinerary",
        "Personal concierge from inquiry to farewell",
        guest.isCouple ? "Thoughtful romance amenity on arrival" : "Thoughtful welcome amenity on arrival",
      ],
      createdAt: new Date().toISOString(),
      status: "draft",
    };
  }

  generateAlternatives(journey: CuratedJourney): JourneyAlternative[] {
    const alternatives: JourneyAlternative[] = [];
    const guest = journey.guestProfile;

    // Alternative 1: Swap property
    const dests = DESTINATIONS.filter((d) => journey.destinations.includes(d.id));
    if (dests.length > 0) {
      const dest = dests[0];
      const props = activeProperties().filter((p) => p.destination === dest.id);
      const currentProps = journey.itinerary.map((d) => d.accommodation);
      const alternative = props.find((p) => !currentProps.includes(p.name));
      if (alternative) {
        const altProfile = { ...guest };
        const altJourney = this.generate(altProfile);
        alternatives.push({
          type: "property-swap",
          title: `Experience ${alternative.name}`,
          description: `An alternative retreat awaits : ${alternative.tagline}`,
          impact: alternative.priceRange ? `Investment: ${alternative.priceRange}` : "A different atmosphere",
          journey: altJourney,
        });
      }
    }

    if (journey.duration > 5) {
      const shortProfile = { ...guest, preferences: { ...guest.preferences } };
      const shortJourney = this.generate(shortProfile);
      alternatives.push({
        type: "duration-change",
        title: "A More Condensed Journey",
        description: "A shorter, more focused itinerary for those who prefer to travel lightly.",
        impact: "Fewer days, a different rhythm",
        journey: shortJourney,
      });
    }

    if (guest.preferences.budgetRange === "ultra-luxury") {
      const budgetProfile: GuestProfile = {
        ...guest,
        preferences: { ...guest.preferences, budgetRange: "premium" },
      };
      const budgetJourney = this.generate(budgetProfile);
      alternatives.push({
        type: "budget-optimization",
        title: "Optimised Value",
        description: "The same magic, thoughtfully balanced for exceptional value.",
        impact: "Approximately 30% reduction in total investment",
        journey: budgetJourney,
      });
    }

    return alternatives;
  }

  /**
   * Generate a branded HTML quote with Kivara design system.
   * Returns a complete HTML document ready for PDF generation or email.
   */
  generateQuote(journey: CuratedJourney): string {
    const isCouple = journey.guestProfile.isCouple ?? true;
    const guestCount = isCouple ? 2 : 1;
    const guestLabel = isCouple ? "Couple" : "Solo Traveller";
    const transferCost = journey.pricing.transfers.reduce((s, t) => s + t.cost, 0);
    const accomSubtotal = journey.pricing.subtotal - transferCost;

    const accommodationRows = journey.pricing.accommodation.map(a => {
      const pppn = a.ratePerNightPPPN || Math.round(a.ratePerNight / guestCount);
      return `
      <tr>
        <td>${a.label}</td>
        <td class="text-center">${a.nights}</td>
        <td class="text-right">$${pppn.toLocaleString()}</td>
        <td class="text-right">$${a.ratePerNight.toLocaleString()}</td>
        <td class="text-right font-bold">$${a.subtotal.toLocaleString()}</td>
      </tr>`;
    }).join("");

    const itineraryRows = journey.itinerary.map(d => `
      <tr>
        <td style="width: 50px; color: ${KIVARA_BRAND.colors.gold}; font-weight: 600;">Day ${d.day}</td>
        <td>${d.title}</td>
        <td style="color: ${KIVARA_BRAND.colors.textMuted};">${d.accommodation}</td>
        <td style="color: ${KIVARA_BRAND.colors.textMuted};">${d.location}</td>
      </tr>`).join("");

    const highlightsList = journey.highlights.map(h => `<li style="margin-bottom: 6px;">${h}</li>`).join("");
    const includedList = journey.includedExtras.map(e => `<li style="margin-bottom: 6px;">${e}</li>`).join("");

    // Occasion-specific greeting
    let occasionNote = "";
    if (journey.guestProfile.specialOccasion === "honeymoon") {
      occasionNote = `<p style="font-size: 14px; color: ${KIVARA_BRAND.colors.gold}; font-style: italic; margin-bottom: 16px;">A journey crafted for the beginning of your forever.</p>`;
    } else if (journey.guestProfile.specialOccasion === "anniversary") {
      occasionNote = `<p style="font-size: 14px; color: ${KIVARA_BRAND.colors.gold}; font-style: italic; margin-bottom: 16px;">Celebrating the beautiful years you have shared.</p>`;
    } else if (journey.guestProfile.specialOccasion === "birthday") {
      occasionNote = `<p style="font-size: 14px; color: ${KIVARA_BRAND.colors.gold}; font-style: italic; margin-bottom: 16px;">A celebration worthy of the extraordinary person you are.</p>`;
    }

    const html = `
      ${documentHeader({ title: "Journey Proposal", reference: journey.id, clientName: journey.guestProfile.name })}
      ${documentBody(`
        <h1>Dear ${journey.guestProfile.name},</h1>
        ${occasionNote}
        <p>It is our privilege to present this personally curated journey for you. Every element has been selected with care — from the properties that will host you to the moments waiting to be discovered.</p>

        ${refBox("Journey Reference", journey.id)}

        ${infoGrid([
          { label: "Guest", value: journey.guestProfile.name },
          { label: "Party", value: `${guestLabel} · ${isCouple ? "2 Guests" : "1 Guest"}` },
          { label: "Duration", value: `${journey.duration} Nights` },
          { label: "Destinations", value: journey.destinations.map(d => d.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())).join(", ") },
        ])}

        <h3>Journey Overview</h3>
        <p style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">${journey.title}</p>
        <p style="font-size: 13px; color: ${KIVARA_BRAND.colors.textMuted}; margin-bottom: 24px;">${journey.subtitle}</p>

        <h3>Itinerary Summary</h3>
        <table>
          <thead>
            <tr><th>Day</th><th>Experience</th><th>Accommodation</th><th>Location</th></tr>
          </thead>
          <tbody>${itineraryRows}</tbody>
        </table>

        <h3>Investment</h3>
        <table>
          <thead>
            <tr><th>Accommodation</th><th class="text-center">Nights</th><th class="text-right">PPPN</th><th class="text-right">${isCouple ? "Per Couple" : "Per Person"}/Night</th><th class="text-right">Subtotal</th></tr>
          </thead>
          <tbody>${accommodationRows}</tbody>
          <tfoot>
            <tr><td colspan="4" class="text-right subtotal-label">Accommodation Subtotal</td><td class="text-right">$${accomSubtotal.toLocaleString()}</td></tr>
            <tr><td colspan="4" class="text-right subtotal-label">Private Charters & Transfers</td><td class="text-right">$${transferCost.toLocaleString()}</td></tr>
            <tr><td colspan="4" class="text-right subtotal-label">Taxes & Fees (10%)</td><td class="text-right font-bold">$${journey.pricing.taxes.toLocaleString()}</td></tr>
            <tr class="total-row"><td colspan="4" class="text-right">Total Investment</td><td class="text-right total-amount">$${journey.pricing.total.toLocaleString()} ${journey.pricing.currency}</td></tr>
          </tfoot>
        </table>
        <p class="text-earth text-xs">${isCouple ? "PPPN = Per Person Per Night (double occupancy). Per Couple/Night = PPPN × 2." : "PPPN = Per Person Per Night (single occupancy)."} Transfer costs cover all private charters and road transfers for your entire party.</p>

        <h3>Journey Highlights</h3>
        <ul style="padding-left: 20px; font-size: 13px; color: ${KIVARA_BRAND.colors.textSecondary}; line-height: 1.8;">${highlightsList}</ul>

        <h3>What's Included</h3>
        <ul style="padding-left: 20px; font-size: 13px; color: ${KIVARA_BRAND.colors.textSecondary}; line-height: 1.8;">${includedList}</ul>

        <hr class="divider" />

        <div style="background: ${KIVARA_BRAND.colors.cream}; padding: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 12px; color: ${KIVARA_BRAND.colors.gold}; border: none; padding: 0; margin-bottom: 8px;">Your Personal Concierge</h3>
          <p style="font-size: 13px; color: ${KIVARA_BRAND.colors.textSecondary}; margin-bottom: 4px;">Your personal concierge is available 24/7 to refine every detail of this journey.</p>
          <p style="font-size: 13px; color: ${KIVARA_BRAND.colors.textSecondary}; margin-bottom: 2px;">Email: <strong>concierge@kivara.africa</strong></p>
          <p style="font-size: 13px; color: ${KIVARA_BRAND.colors.textSecondary}; margin: 0;">WhatsApp: <strong>+27 87 123 4567</strong></p>
        </div>

        <p>Should you wish to adjust any element of this journey, simply reply. Your personal concierge is ready to refine every detail until it feels perfectly yours.</p>
        <p>Warmest regards,<br><strong style="color: ${KIVARA_BRAND.colors.gold};">Your Kivara Concierge</strong></p>
      `)}
      ${documentFooter()}
    `;

    return wrapDocument(html, { title: `Journey Proposal ${journey.id}` });
  }

  // ── LLM-Powered Journey Curation ───────────────────────────────────────

  /**
   * Generate a journey using LLM for personalized, brand-voice curation.
   * Falls back to rule-based generation if LLM is unavailable.
   * Pricing is always calculated deterministically via calculatePricing().
   */
  async llmGenerate(guest: GuestProfile): Promise<CuratedJourney> {
    try {
      // Pull operator-set transfer pricing before any pricing is computed, so
      // the numbers a quote shows are the numbers an admin edited. Never throws
      // and never blocks generation — a failed read falls back to the shipped
      // supplier rates.
      await warmTransferPricing();
      // The live catalog, loaded before the prompt is built.
      //
      // This used to be absent, while the prompt still told the model to "select
      // the best destinations and properties from the available inventory". The
      // model had never been shown an inventory, so it invented accommodation
      // names, the exact-name matcher below found nothing, and the whole AI result
      // was discarded in favour of the rule-based path. `getKnowledgeContext()`
      // already loads the active catalog (is_active, so operators control what is
      // sellable), plus brand canon, commercial policy and the experiences catalog.
      const knowledge = await getKnowledgeContext();
      const liveCatalog = knowledge.products;
      if (liveCatalog.length === 0) {
        throw new Error("no active properties in the catalog");
      }
      // Point the rule-based path at exactly the rows the prompt was built
      // from: if this LLM call falls back mid-way, selection and pricing must
      // not resurrect the constants mirror an operator has since edited. This
      // costs no extra query — it is the fetch we just did.
      primeLiveCatalog(liveCatalog);
      // Resolve the model against the real catalog, not a hardcoded mirror of it.
      const catalogByName = new Map<string, JourneyProperty>(
        liveCatalog.map((p) => {
          const property = toJourneyProperty(p);
          return [property.name.trim().toLowerCase(), property];
        })
      );

      const systemPrompt = `You are Kivara's lead journey curator — a world-class luxury travel designer with decades of experience crafting bespoke African journeys for ultra-high-net-worth couples. You understand that luxury is not about price — it is about emotional resonance, exclusivity, and the feeling of being truly known.

${knowledge.assembled}

KIVARA BRAND VOICE:
- Tone: Warm, sophisticated, intimate. Never transactional — always evocative.
- Language: "sanctuary" not "hotel", "journey" not "trip", "investment" not "price", "discover" not "visit", "curated" not "arranged", "bespoke" not "custom"
- Spirit: Africa's most coveted romance sanctuary. We occupy the space between Aman's serenity and &Beyond's wilderness.
- Emotional register: We speak to the heart, not the head. Every word should make the guest feel something.

LUXURY TRAVEL PSYCHOLOGY — WHAT ULTRA-HIGH-NET-WORTH TRAVELERS WANT:
1. EXCLUSIVITY: They want what others cannot have. Private access, hidden locations, experiences reserved for the few.
2. TIME: They are time-poor. Every moment must feel effortless, unhurried, intentional. No rushing.
3. AUTHENTICITY: They have seen the world. They crave genuine connection — with people, places, and each other.
4. STORY: They want a narrative they can retell. Moments that become chapters in their love story.
5. SENSORY RICHNESS: Light, sound, scent, texture — the bush at dawn, the lake at sunset, the spice of Zanzibar.
6. PRIVACY: Seclusion without isolation. Intimacy without loneliness.
7. SURPRISE: Delight them with unexpected touches they did not know they wanted.

SPECIAL OCCASION INTELLIGENCE:
- HONEYMOON: This is the beginning of forever. Every detail must feel like a love letter. Private dinners, sunrise moments, couples rituals. The journey should feel like it was designed for no one else in the world.
- ANNIVERSARY: They are celebrating endurance and depth. Nostalgia, milestone acknowledgment, and reconnection. Reference the passage of time beautifully.
- BIRTHDAY: A celebration in the wild. Surprise elements, unexpected delights, a sense of occasion woven through every day.
- PROPOSAL: The most important question of their lives. Every moment builds toward that one. Secrecy, perfection, and a photographer who captures the moment they will relive forever.
- GENERAL: Treat every journey as if it is the most important trip they have ever taken. Because for them, it is.

PARTY COMPOSITION INTELLIGENCE:
- COUPLE (no kids): Maximum romance, private moments, couples-only activities, unhurried pacing.
- COUPLE (with kids): Family-friendly luxury, activities for all ages, moments of parental connection.
- SOLO TRAVELER: Self-discovery, reflection, personal transformation, encounters with the wild.
- FRIENDS GROUP: Shared adventure, group dining, bonding experiences, lively energy.

ACTIVITY PACING:
- Luxury travel is UNHURRIED. Maximum 1-2 activities per day.
- Morning: Gentle start (slow breakfast, sunrise moment) or active exploration (safari, walking).
- Afternoon: Rest, reflection, or curated encounter.
- Evening: Culinary ceremony, stargazing, or intimate conversation.
- Build in "white space" — time with nothing planned. That is when magic happens.

Respond in valid JSON only with this exact structure:
{
  "title": string (evocative journey title that captures the emotional essence, e.g. "A Romance Written in the Stars"),
  "subtitle": string (brief subtitle with destinations and nights),
  "destinations": string[] (destination IDs used),
  "itinerary": [
    {
      "day": number,
      "title": string (evocative, not generic — e.g. "The Light Over Luangwa" not "Day 2"),
      "location": string,
      "accommodation": string (exact property name from inventory),
      "accommodationImage": string (heroImage URL from property data),
      "meals": string[],
      "activities": [
        {
          "time": string,
          "title": string (sensory, specific — e.g. "Dawn Walking Safari" not "Morning Activity"),
          "description": string (2-3 sentences, brand voice, sensory details — light, sound, scent, texture. Make them FEEL it.),
          "duration": string,
          "included": boolean,
          "type": "safari" | "water-sports" | "cultural" | "spa" | "dining" | "relaxation" | "adventure" | "wellness" | "other"
        }
      ],
      "highlights": string[] (2-3 highlights for this day, emotionally resonant)
    }
  ],
  "highlights": string[] (3-5 journey-level highlights that capture the emotional arc),
  "includedExtras": string[] (4-6 included services that feel exclusive),
  "planningNotes": string (1-2 sentences of personalized advice that shows deep understanding of this guest)
}`;

      const userMessage = `Create a bespoke luxury journey for this guest. This is not just a trip — it is a chapter in their love story.

GUEST PROFILE:
${JSON.stringify(
  {
    name: guest.name,
    isCouple: guest.isCouple,
    specialOccasion: guest.specialOccasion,
    preferences: guest.preferences,
    desiredNights: guest.desiredNights,
    pastDestinations: guest.pastDestinations,
    wishlist: guest.wishlist,
    explicitDestinations: guest.explicitDestinations,
  },
  null,
  2
)}

${guest.specialOccasion ? `THIS JOURNEY CELEBRATES: ${guest.specialOccasion.toUpperCase()}
This occasion is the emotional anchor of the entire journey. Every detail should reflect and honor this moment. For honeymoons — this is the beginning of forever. For anniversaries — celebrate the depth of their bond. For birthdays — make them feel like the most important person in Africa.` : "No specific occasion — craft a journey of discovery and reconnection."}

${guest.explicitDestinations && guest.explicitDestinations.length > 0
  ? `The guest has explicitly requested these destinations. Use ONLY these:
${guest.explicitDestinations.map((d) => `  - ${d.destinationId}${d.propertyId ? ` (property: ${d.propertyId})` : ""} for ${d.nights} nights`).join("\n")}`
  : `Based on their profile, select the best destinations and properties from the available inventory.`}

DESIGN PRINCIPLES:
1. Select the best-matching properties — consider occasion, party composition, budget, and travel style
2. Create unique, vivid activity descriptions in Kivara's brand voice — sensory details (light, sound, scent, texture)
3. Flow naturally between locations with appropriate pacing — luxury is unhurried
4. 1-2 activities per day maximum — build in white space for spontaneous magic
5. Include at least one "moment of surprise" — something they did not expect
6. Reference relevant experiences from the inventory (dining, safari, spa, cultural)
7. The final day should feel like a gentle farewell, not a rushed departure

PROPERTY SELECTION INTELLIGENCE:
- Romantic/relaxation travelers → Lake Malawi or Zanzibar beach properties
- Adventure travelers → South Luangwa (walking safaris, game drives)
- Mixed style → Bush & Beach combination (Luangwa + Zanzibar)
- Couples on honeymoon → properties with romantic highlights and privacy
- Ultra-luxury budget → premium villas and suites with butler service
- Anniversary celebrations → properties with intimate dining and sunset moments
- Birthday celebrations → properties with unique experiences and surprise potential

NON-NEGOTIABLE: the "accommodation" field of every day MUST be copied character-for-character from a property name in the PROPERTIES / LODGES section above. Do not invent, shorten, rebrand, pluralise or "improve" a name. Pricing and availability are resolved by exact match against the catalog, so a name that is not in the catalog costs the guest the entire AI-curated itinerary and silently falls back to a generic template. If no property fits, use the closest one that does.`;

      const messages: LlmMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ];

      const { data } = await callLlmJson<{
        title: string;
        subtitle: string;
        destinations: string[];
        itinerary: Array<{
          day: number;
          title: string;
          location: string;
          accommodation: string;
          accommodationImage: string;
          meals: string[];
          activities: Array<{
            time: string;
            title: string;
            description: string;
            duration: string;
            included: boolean;
            type: string;
          }>;
          highlights: string[];
        }>;
        highlights: string[];
        includedExtras: string[];
        planningNotes: string;
      }>(messages, { temperature: 0.7, maxTokens: 4096 });

      // Map property names to actual property data for pricing
      const propertyAssignments: { property: JourneyProperty; nights: number }[] = [];
      const dayAccommodations = new Map<string, number>(); // property name → night count

      for (const day of data.itinerary) {
        const propName = day.accommodation;
        dayAccommodations.set(propName, (dayAccommodations.get(propName) || 0) + 1);
      }

      // Resolved against the live catalog, not the hardcoded constants mirror, so
      // an operator activating a property makes it immediately selectable.
      const unmatchedProperties: string[] = [];
      for (const [propName, nights] of dayAccommodations) {
        const property = catalogByName.get(propName.trim().toLowerCase());
        if (property) {
          propertyAssignments.push({ property, nights });
        } else {
          unmatchedProperties.push(propName);
        }
      }

      // If properties couldn't be matched, fall back to rule-based
      if (propertyAssignments.length === 0) {
        console.warn(
          "LLM journey: no properties matched, falling back to rule-based",
          { unmatchedProperties: unmatchedProperties.join(", ") }
        );
        return this.generate(guest);
      }
      if (unmatchedProperties.length > 0) {
        // Partial matches still produce a journey, but a dropped day would silently
        // change the itinerary the guest was quoted, so record what was lost.
        console.warn("LLM journey: unmatched accommodations dropped", {
          unmatchedProperties: unmatchedProperties.join(", "),
        });
      }

      // Calculate pricing deterministically
      const pricing = calculatePricing(propertyAssignments, guest);

      // Build itinerary with proper images and transfer data
      const itinerary: JourneyDay[] = data.itinerary.map((day) => {
        const property = catalogByName.get(day.accommodation.trim().toLowerCase());

        return {
          day: day.day,
          title: day.title,
          location: day.location,
          accommodation: property ? property.name : day.accommodation,
          accommodationImage: property?.heroImage || day.accommodationImage || "",
          meals: day.meals || ["Breakfast", "Dinner"],
          activities: day.activities.map((a) => ({
            time: a.time || "Flexible",
            title: a.title,
            description: a.description,
            duration: a.duration || "2 hours",
            included: a.included ?? true,
            type: (a.type as Activity["type"]) || "other",
          })),
          transfers: [],
          highlights: day.highlights || [],
        };
      });

      return {
        id: generateId(),
        title: data.title || "A Curated African Journey",
        subtitle:
          data.subtitle ||
          `${data.destinations?.length || 1} destinations · ${propertyAssignments.reduce((s, p) => s + p.nights, 0)} nights`,
        guestProfile: guest,
        destinations: data.destinations || [],
        duration: propertyAssignments.reduce((s, p) => s + p.nights, 0),
        pricing,
        itinerary,
        highlights: data.highlights || [],
        includedExtras: data.includedExtras || [
          "All accommodation and daily dining",
          "Private transfers throughout your journey",
          "Personal concierge from inquiry to farewell",
          guest.isCouple ? "Thoughtful romance amenity on arrival" : "Thoughtful welcome amenity on arrival",
        ],
        createdAt: new Date().toISOString(),
        status: "draft",
      };
    } catch (err) {
      // LLM failed : fall back to rule-based generation
      console.warn(
        "LLM journey generation failed, using rule based fallback:",
        err instanceof Error ? err.message : String(err)
      );
      return this.generate(guest);
    }
  }
}

export const journeyEngine = new JourneyEngine();
