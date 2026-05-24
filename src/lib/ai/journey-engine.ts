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

// ── Transfer Generation ────────────────────────────────────────────────

function generateTransfer(
  fromLocation: string,
  toLocation: string,
  index: number
): Transfer {
  const isCrossDestination =
    (fromLocation.includes("Malawi") && toLocation.includes("Luangwa")) ||
    (fromLocation.includes("Luangwa") && toLocation.includes("Zanzibar")) ||
    (fromLocation.includes("Malawi") && toLocation.includes("Zanzibar"));

  return {
    from: fromLocation,
    to: toLocation,
    mode: isCrossDestination ? "flight" : index === 0 ? "flight" : "road",
    duration: isCrossDestination ? "~3 hours (incl. connection)" : "~45 minutes",
    notes: isCrossDestination ? "Private charter or scheduled flight with VIP lounge access." : undefined,
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

  for (const { property, nights } of propertyAssignments) {
    // 1. Extract the maximum seasonal PPPN price
    const baseRate = extractMaxPppn(property.priceRange || "");
    // 2. Apply 45% universal markup
    const rateAfterMarkup = Math.round(baseRate * (1 + PPPN_MARKUP));
    // 3. Ultra-luxury guests get an additional premium tier on top
    const effectiveRate = guest.preferences.budgetRange === "ultra-luxury"
      ? Math.round(rateAfterMarkup * 1.25)
      : rateAfterMarkup;
    const subtotalRow = effectiveRate * nights;
    accommodation.push({
      label: property.name,
      nights,
      ratePerNight: effectiveRate,
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
    const allDestinations = DESTINATIONS.map((d) => d.id);
    const selectedDestinations = guest.preferences.travelStyle === "relaxation"
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
    // Adjust for rounding: add/subtract from largest to hit target exactly
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
        else break; // can't go below 2
      }
    }

    const propertyAssignments: { property: (typeof PROPERTIES)[number]; nights: number }[] = [];
    for (let i = 0; i < destNights.length; i++) {
      const props = selectProperties(guest, destNights[i].destId, 1);
      for (const p of props) {
        propertyAssignments.push({ property: p, nights: allocated[i] });
      }
    }

    const today = new Date();
    const itinerary: JourneyDay[] = [];
    let dayCounter = 1;

    for (let i = 0; i < propertyAssignments.length; i++) {
      const { property, nights } = propertyAssignments[i];
      const location = property.location || property.destination;

      const arrivalDate = new Date(today);
      arrivalDate.setDate(arrivalDate.getDate() + dayCounter - 1);
      itinerary.push({
        day: dayCounter,
        title: `Arrive at ${property.name}`,
        location,
        accommodation: property.name,
        accommodationImage: property.heroImage,
        meals: ["Dinner"],
        activities: generateActivities(property, guest, "arrival"),
        transfers: i > 0
          ? [generateTransfer(propertyAssignments[i - 1].property.location, property.location, i)]
          : [generateTransfer("Airport", property.location, 0)],
        highlights: [`Welcome to ${property.name}`, property.tagline].filter(Boolean) as string[],
      });
      dayCounter++;

      for (let n = 1; n <= nights; n++) {
        const fullDate = new Date(today);
        fullDate.setDate(fullDate.getDate() + dayCounter - 1);
        itinerary.push({
          day: dayCounter,
          title: n < nights ? `Explore ${location}` : `Farewell to ${property.name}`,
          location,
          accommodation: property.name,
          accommodationImage: property.heroImage,
          meals: ["Breakfast", "Lunch", "Dinner"],
          activities: generateActivities(property, guest, n < nights ? "full" : "departure"),
          transfers: [],
          highlights: n < nights
            ? (property.romanticHighlights ? pick(property.romanticHighlights, 2) : ["A day of curated experiences"])
            : ["A final evening to savour", "Last chance to absorb the atmosphere"],
        });
        dayCounter++;
      }
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
