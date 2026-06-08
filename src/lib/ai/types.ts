// ─── Kivara AI Journey Curation Engine : Core Types ──────────────────────
// Data models for guest profiling, journey generation, and pricing.

export interface DestinationAssignment {
  destinationId: string;  // e.g. "lake-malawi"
  propertyId?: string;    // e.g. "kaya-mawa" : omit for auto-select
  nights: number;         // nights at this destination
}

export interface GuestProfile {
  id: string;
  name: string;
  email: string;
  isCouple: boolean;
  specialOccasion?: string; // e.g. "honeymoon", "anniversary", "birthday"
  preferences: {
    travelStyle: "romantic" | "adventure" | "relaxation" | "cultural" | "mixed";
    accommodationStyle: "intimate-boutique" | "luxury-resort" | "eco-camp" | "private-villa";
    activityLevel: "low" | "moderate" | "high";
    budgetRange: "premium" | "ultra-luxury";
    dietaryRestrictions?: string[];
    interests?: string[];
  };
  desiredNights?: number;
  pastDestinations?: string[];
  wishlist?: string[];
  travelDates?: {
    start: string; // ISO date
    end: string;
    flexible: boolean;
  };
  // Explicit destination selection : overrides auto-selection when provided
  explicitDestinations?: DestinationAssignment[];
}

export interface JourneyDay {
  day: number;
  title: string;
  location: string;
  accommodation: string;
  accommodationImage?: string;
  meals: string[];
  activities: Activity[];
  transfers: Transfer[];
  highlights: string[];
  notes?: string;
}

export interface Activity {
  time?: string;
  title: string;
  description: string;
  duration: string;
  included: boolean;
  type:
    | "safari"
    | "water-sports"
    | "cultural"
    | "spa"
    | "dining"
    | "relaxation"
    | "adventure"
    | "wellness"
    | "other";
}

export interface Transfer {
  from: string;
  to: string;
  mode: "flight" | "road" | "boat" | "helicopter";
  duration: string;
  cost: number;           // Per person cost for this leg
  currency?: string;
  notes?: string;
}

export interface AccommodationItem {
  label: string;
  nights: number;
  ratePerNight: number;       // Total per night for the booking (PPPN × guests for couple)
  ratePerNightPPPN: number;   // Per person per night base rate
  subtotal: number;
}

export interface ActivityCostItem {
  label: string;
  cost: number;
  pricingModel?: "per-person" | "per-couple" | "per-booking";
}

export interface TransferCostItem {
  label: string;
  cost: number;
}

export interface JourneyPricing {
  accommodation: AccommodationItem[];
  activities: ActivityCostItem[];
  transfers: TransferCostItem[];
  subtotal: number;
  taxes: number;
  total: number;
  currency: string;
}

export interface CuratedJourney {
  id: string;
  title: string;
  subtitle: string;
  guestProfile: GuestProfile;
  destinations: string[];
  duration: number; // total nights
  pricing: JourneyPricing;
  itinerary: JourneyDay[];
  highlights: string[];
  includedExtras: string[];
  createdAt: string;
  status: "draft" | "sent" | "confirmed" | "modified";
}

export interface JourneyAlternative {
  type: "property-swap" | "route-change" | "duration-change" | "budget-optimization";
  title: string;
  description: string;
  impact: string; // e.g. "+$1,200 / shorter flight"
  journey: CuratedJourney;
}
