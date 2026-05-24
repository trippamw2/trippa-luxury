// ─── Kivara AI Journey Curation Engine (Brand Voice) ─────────────────────
// Rule-based journey builder that matches guest profiles to properties,
// generates day-by-day itineraries, and calculates pricing.
// All guest-facing prose uses the KIVARA brand vocabulary and tone.

import { PROPERTIES, DESTINATIONS, PACKAGES } from "../constants";
import type {
  GuestProfile,
  CuratedJourney,
  JourneyDay,
  JourneyPricing,
  Activity,
  Transfer,
  JourneyAlternative,
} from "./types";
import { luxury } from "@/lib/voice";

// ── Helpers ─────────────────────────────────────────────────────────────

function generateId(): string {
  return `JRN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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
  safari: "The golden light of dawn spills across the plains as the bush stirs to life — a quiet communion with the wild",
  "water-sports": "The lake shimmers in the midday sun, inviting you into its crystalline embrace",
  cultural: "The rhythm of an ancient culture unfolds before you, whispered through song, dance, and story",
  spa: "Stillness descends as skilled hands work away the residue of the world beyond",
  dining: "Under a canopy of stars, dinner becomes a ceremony — each course a celebration of place",
  relaxation: "Time slows. The world recedes. You surrender to the gentle rhythm of Africa",
  adventure: "The path less travelled beckons —每一步 a discovery, every vista a revelation",
  wellness: "Breathe. Stretch. Surrender. Here, wellness is not an activity but a way of being",
  other: "A moment crafted to linger in memory",
};

// ── Matching Logic ──────────────────────────────────────────────────────

function scorePropertyForGuest(
  property: (typeof PROPERTIES)[number],
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
): (typeof PROPERTIES)[number][] {
  const dest = DESTINATIONS.find((d) => d.id === destinationId);
  if (!dest) return [];

  const available = PROPERTIES.filter((p) => dest.properties.includes(p.id));
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
  property: (typeof PROPERTIES)[number],
  guest: GuestProfile,
  dayType: "arrival" | "full" | "departure"
): Activity[] {
  const acts: Activity[] = [];
  const ambiance = ACCOMMODATION_BRAND[guest.preferences.accommodationStyle] || "a thoughtfully chosen haven";

  if (dayType === "arrival") {
    acts.push({
      time: "Afternoon",
      title: "Arrival & Welcome",
      description: `Arrive at ${property.name}, ${ambiance} in the heart of ${property.location}. A welcome awaits — cool towels, a gentle orientation, and the first breath of your new surroundings.`,
      duration: "2 hours",
      included: true,
      type: "relaxation",
    });
    if (guest.isCouple) {
      acts.push({
        time: "Evening",
        title: "Welcome Dinner",
        description: `A private dinner at ${property.name} — the first of many evenings where cuisine becomes ceremony, and the African night enfolds you.`,
        duration: "2 hours",
        included: true,
        type: "dining",
      });
    } else {
      acts.push({
        time: "Evening",
        title: "Evening Orientation",
        description: `Settle in with a sundowner as your concierge walks you through the days ahead — a gentle beginning to your journey.`,
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
      description: "One last morning in this place. Breakfast lingers as you absorb the atmosphere — a quiet farewell before your next chapter.",
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
      { name: "Likoma Airport", code: "LIX", propertyIds: ["kaya-mawa", "blue-zebra-island-lodge"] },
      { name: "Makokola Airfield", code: "MAK", propertyIds: ["makokola-retreat", "pumulani-lodge"] },
    ],
  },
  "south-luangwa": {
    pointOfEntry: [
      { name: "Kenneth Kaunda International Airport", code: "LUN" },
      { name: "Kamuzu International Airport", code: "LLW" },
    ],
    local: [
      { name: "Mfuwe International Airport", code: "MFU", propertyIds: ["chinzombo", "puku-ridge-camp", "shawa-luangwa", "luangwa-river-camp"] },
    ],
  },
  zanzibar: {
    pointOfEntry: [
      { name: "Abeid Amani Karume International Airport", code: "ZNZ" },
    ],
    local: [
      { name: "Abeid Amani Karume International Airport", code: "ZNZ", propertyIds: ["xanadu-villas", "kilindi-zanzibar", "baraza-resort-spa", "the-palms-zanzibar", "the-residence-zanzibar"] },
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

function getDestIdForProperty(propertyId: string): string {
  for (const [destId, data] of Object.entries(AIRPORTS)) {
    for (const local of data.local) {
      if (local.propertyIds.includes(propertyId)) return destId;
    }
  }
  return "lake-malawi";
}

// ── Transfer Generation ────────────────────────────────────────────────

function generateTransfer(
  fromDestId: string | null,
  toDestId: string,
  fromPropertyId: string | null,
  toPropertyId: string,
  index: number
): Transfer {
  // First leg: point of entry → local airport
  if (index === 0 && fromDestId === null) {
    const poe = getPointOfEntry(toDestId);
    const local = getLocalAirport(toPropertyId, toDestId);
    const isSame = poe.name === local.name;
    return {
      from: isSame ? "International Arrival" : poe.name,
      to: isSame ? `${local.name} (${local.code}) — Property Transfer` : `${local.name} (${local.code})`,
      mode: isSame ? "road" : "flight",
      duration: isSame ? "~30 minutes" : `~45 minutes`,
      notes: isSame ? "Complimentary private transfer to property." : `Private charter from ${poe.code} to ${local.code}. VIP meet-and-greet upon arrival.`,
    };
  }

  // Cross-destination: local airport of previous → local airport of current
  if (fromDestId && fromPropertyId && fromDestId !== toDestId) {
    const fromLocal = getLocalAirport(fromPropertyId, fromDestId);
    const toLocal = getLocalAirport(toPropertyId, toDestId);
    const duration: Record<string, string> = {
      "lake-malawi_south-luangwa": "~2 hours (charter flight)",
      "south-luangwa_zanzibar": "~3 hours (via charter + connection)",
      "lake-malawi_zanzibar": "~2.5 hours (direct charter)",
    };
    const key = `${fromDestId}_${toDestId}`;
    return {
      from: `${fromLocal.name} (${fromLocal.code})`,
      to: `${toLocal.name} (${toLocal.code})`,
      mode: "flight",
      duration: duration[key] || "~2.5 hours (charter flight)",
      notes: "Private air charter between destinations. All ground transfers included.",
    };
  }

  // Same destination / intra-destination
  const local = getLocalAirport(toPropertyId, toDestId);
  return {
    from: `${local.name} (${local.code})`,
    to: `${local.name} (${local.code}) — Property`,
    mode: "road",
    duration: "~30–45 minutes",
    notes: "Private safari vehicle with refreshments.",
  };
}

function generateLastTransfer(
  fromDestId: string,
  fromPropertyId: string
): Transfer {
  const local = getLocalAirport(fromPropertyId, fromDestId);
  return {
    from: `${local.name} (${local.code})`,
    to: `${local.name} (${local.code}) — Departure`,
    mode: "road",
    duration: "~30 minutes",
    notes: "Private transfer to airport for onward journey.",
  };
}

// ── Pricing Calculation ────────────────────────────────────────────────

/** Extract the maximum per-person-per-night price from a priceRange string.
 *  Handles formats: "$X to $Y", "From $X", and bare "$X".
 *  Falls back to a default if parsing fails.
 */
function extractMaxPppn(priceRange: string): number {
  // Try "$X to $Y" format → return Y
  const rangeMatch = priceRange.match(/\$([\d,]+)\s*to\s*\$([\d,]+)/i);
  if (rangeMatch) {
    return parseInt(rangeMatch[2].replace(/,/g, ""));
  }
  // Try "From $X" format → return X
  const fromMatch = priceRange.match(/from\s*\$?([\d,]+)/i);
  if (fromMatch) {
    return parseInt(fromMatch[1].replace(/,/g, ""));
  }
  // Fallback: grab the first dollar figure
  const fallback = priceRange.match(/\$?([\d,]+)/);
  return fallback ? parseInt(fallback[1].replace(/,/g, "")) : 600;
}

const PPPN_MARKUP = 0.45; // 45% margin added to every property's PPPN

function calculatePricing(
  propertyAssignments: { property: (typeof PROPERTIES)[number]; nights: number }[],
  guest: GuestProfile
): JourneyPricing {
  const accommodation: JourneyPricing["accommodation"] = [];
  let subtotal = 0;

  const guestCount = guest.isCouple ? 2 : 1;

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

  const taxes = Math.round(subtotal * 0.1);
  const total = subtotal + taxes;

  return {
    accommodation,
    activities: [],
    transfers: [],
    subtotal,
    taxes,
    total,
    currency: "USD",
  };
}

// ── Journey Builder ─────────────────────────────────────────────────────

export class JourneyEngine {
  generate(guest: GuestProfile): CuratedJourney {
    // Use explicit destination assignments if provided, otherwise auto-select
    const hasExplicit = guest.explicitDestinations && guest.explicitDestinations.length > 0;

    let selectedDestinations: string[];
    let propertyAssignments: { property: (typeof PROPERTIES)[number]; nights: number }[];

    if (hasExplicit) {
      // Use explicit destination/property/nights from user
      selectedDestinations = guest.explicitDestinations!.map((d) => d.destinationId);
      propertyAssignments = [];
      for (const assign of guest.explicitDestinations!) {
        let props: (typeof PROPERTIES)[number][];
        if (assign.propertyId) {
          // Specific property requested
          const found = PROPERTIES.find((p) => p.id === assign.propertyId);
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
      let allocated = destNights.map((d) => Math.max(2, Math.round((d.base / totalBase) * targetNights)));
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

    const today = new Date();
    const itinerary: JourneyDay[] = [];
    let dayCounter = 1;

    for (let i = 0; i < propertyAssignments.length; i++) {
      const { property, nights } = propertyAssignments[i];
      const location = property.location || property.destination;
      const currentDestId = getDestIdForProperty(property.id);

      // First day: arrival with transfer
      const prevDestId = i > 0 ? getDestIdForProperty(propertyAssignments[i - 1].property.id) : null;
      const prevPropertyId = i > 0 ? propertyAssignments[i - 1].property.id : null;
      const arrivalTransfers: Transfer[] = [];

      if (i === 0) {
        // Point of entry → local airport
        arrivalTransfers.push(generateTransfer(null, currentDestId, null, property.id, 0));
      } else if (prevDestId) {
        // Previous property → this property
        arrivalTransfers.push(generateTransfer(prevDestId, currentDestId, prevPropertyId, property.id, i));
      }

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

    // Add departure transfer on the last day
    if (propertyAssignments.length > 0) {
      const lastPA = propertyAssignments[propertyAssignments.length - 1];
      const lastDestId = getDestIdForProperty(lastPA.property.id);
      const lastDayIdx = itinerary.length - 1;
      itinerary[lastDayIdx].transfers.push(generateLastTransfer(lastDestId, lastPA.property.id));
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
      const props = PROPERTIES.filter((p) => dest.properties.includes(p.id));
      const currentProps = journey.itinerary.map((d) => d.accommodation);
      const alternative = props.find((p) => !currentProps.includes(p.name));
      if (alternative) {
        const altProfile = { ...guest };
        const altJourney = this.generate(altProfile);
        alternatives.push({
          type: "property-swap",
          title: `Experience ${alternative.name}`,
          description: `An alternative retreat awaits — ${alternative.tagline}`,
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
   * Generate a formatted quote summary with brand voice.
   */
  generateQuote(journey: CuratedJourney): string {
    const lines = [
      "═══════════════════════════════════════",
      "  KIVARA LUXURY TRAVEL — JOURNEY PROPOSAL",
      "═══════════════════════════════════════",
      "",
      `  ${journey.title}`,
      `  ${journey.subtitle}`,
      "",
      "  ── ITINERARY OVERVIEW ──",
      ...journey.itinerary.map(
        (d) => `  Day ${d.day}: ${d.title} @ ${d.accommodation}`
      ),
      "",
      "  ── INVESTMENT ──",
      ...journey.pricing.accommodation.map(
        (a) => `  ${a.label}: ${a.nights} nights × $${a.ratePerNight}/night = $${a.subtotal.toLocaleString()}`
      ),
      "",
      `  Subtotal: $${journey.pricing.subtotal.toLocaleString()}`,
      `  Taxes & Fees (10%): $${journey.pricing.taxes.toLocaleString()}`,
      `  TOTAL INVESTMENT: $${journey.pricing.total.toLocaleString()} ${journey.pricing.currency}`,
      "",
      "  ── HIGHLIGHTS ──",
      ...journey.highlights.map((h) => `  · ${h}`),
      "",
      "  ── INCLUDED ──",
      ...journey.includedExtras.map((e) => `  · ${e}`),
      "",
      "  Proposal ID: " + journey.id,
      "  Created: " + new Date(journey.createdAt).toLocaleDateString(),
      "",
      "  Kivara Concierge: concierge@kivara.luxury",
      "═══════════════════════════════════════",
    ];
    return lines.join("\n");
  }
}

export const journeyEngine = new JourneyEngine();
