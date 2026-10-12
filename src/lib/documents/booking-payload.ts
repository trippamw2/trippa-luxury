// ─── Booking → document payload builders ─────────────────────────────────
// The document generators (invoice, receipt, itinerary, …) were written against
// rich, typed objects — InvoiceData, CuratedJourney, TravelBriefData — but the
// admin bookings page has only ever held flat scalars (a name, a total, two
// dates). The download route shovelled those flat query params straight into the
// generators, which then dereferenced nested fields that were never passed
// (`lineItems.map`, `journey.pricing.transfers.reduce`, …) and threw. Every
// booking document 500'd.
//
// This module is the missing translation layer. Given a booking row — and, for
// itineraries, the saved journey the quote flow attached to it — it produces a
// fully-populated, generator-safe payload with a default for every field the
// generators touch. It is deliberately pure: no I/O, so the shape of each
// document is unit-testable without a database.

import type {
  Activity,
  ActivityCostItem,
  AccommodationItem,
  CuratedJourney,
  GuestProfile,
  JourneyDay,
  JourneyPricing,
  Transfer,
  TransferCostItem,
} from "@/lib/ai/types";
import type { InvoiceData } from "@/lib/documents/invoice";
import type { ReceiptDocumentData } from "@/lib/documents/receipt";
import type { PaymentReminderData } from "@/lib/documents/payment-reminder";
import type { TravelBriefData } from "@/lib/documents/travel-brief";

/** Document types this module can build from a booking row. */
export type BookingDocumentType =
  | "invoice"
  | "receipt"
  | "itinerary"
  | "welcome"
  | "travel-brief"
  | "payment-reminder"
  | "thank-you";

export const BOOKING_DOCUMENT_TYPES: readonly BookingDocumentType[] = [
  "invoice",
  "receipt",
  "itinerary",
  "welcome",
  "travel-brief",
  "payment-reminder",
  "thank-you",
];

/** Narrowing predicate for the closed set of booking-derived document types. */
export function isBookingDocumentType(value: string): value is BookingDocumentType {
  return (BOOKING_DOCUMENT_TYPES as readonly string[]).includes(value);
}

/**
 * A booking row already run through `mapKeysToCamel`. Numeric columns arrive as
 * `number | string | null` depending on how PostgREST serialises them, so the
 * builders coerce defensively rather than trusting the type.
 */
export interface BookingRow {
  id: string;
  bookingReference?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  destination?: string | null;
  propertyId?: string | null;
  packageId?: string | null;
  guestProfileId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  guestsCount?: number | string | null;
  totalAmount?: number | string | null;
  depositAmount?: number | string | null;
  balanceAmount?: number | string | null;
  balanceDueDate?: string | null;
  depositDueDate?: string | null;
  finalAmount?: number | string | null;
  discountAmount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  specialRequests?: string | null;
  depositMethod?: string | null;
  createdAt?: string | null;
}

/** A `saved_journeys` row (camelCase) — the rich journey the quote flow attached. */
export interface SavedJourneyRow {
  id?: string | null;
  title?: string | null;
  subtitle?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  isCouple?: boolean | null;
  specialOccasion?: string | null;
  destinations?: unknown;
  duration?: number | null;
  itinerary?: unknown;
  pricing?: unknown;
  highlights?: unknown;
  includedExtras?: unknown;
  preferences?: unknown;
  createdAt?: string | null;
}

export interface BuildContext {
  /** `platform_settings` as a key→value map (bank details, links). */
  settings?: Record<string, string>;
  /** The journey linked to this booking, when one exists. */
  journey?: SavedJourneyRow | null;
  /** Injectable clock for deterministic output/tests. */
  now?: Date;
}

// ─── Coercion helpers ────────────────────────────────────────────────────

function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.eE+-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function str(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toIsoDate(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function todayIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function nightsBetween(start: unknown, end: unknown): number {
  const s = toIsoDate(start);
  const e = toIsoDate(end);
  if (!s || !e) return 0;
  const nights = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86_400_000);
  return nights > 0 ? nights : 0;
}

/** Booking reference, falling back to a short id-derived token. */
function refOf(booking: BookingRow): string {
  return str(booking.bookingReference) || (booking.id ? booking.id.slice(0, 8).toUpperCase() : "KIVARA");
}

function destinationLabel(booking: BookingRow): string {
  return titleCase(str(booking.destination, "your destination"));
}

function setting(settings: Record<string, string> | undefined, key: string): string {
  const value = settings?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function bankFromSettings(settings?: Record<string, string>): InvoiceData["bankDetails"] {
  const bankName = setting(settings, "bank_name");
  if (!bankName) return undefined;
  return {
    bankName,
    accountName: setting(settings, "bank_account_name"),
    accountNumber: setting(settings, "bank_account_number"),
    iban: setting(settings, "bank_iban"),
    swiftCode: setting(settings, "bank_swift_code"),
    routingNumber: setting(settings, "bank_routing_number") || undefined,
    sortCode: setting(settings, "bank_sort_code") || undefined,
    country: setting(settings, "bank_country") || undefined,
  };
}

// ─── Journey normalisation ───────────────────────────────────────────────
// saved_journeys stores pricing/itinerary as JSONB with `{}`/`[]` defaults and
// no runtime guarantee of shape. Every nested collection the itinerary
// generator iterates is rebuilt here so a partial row can never crash a render.

const ACTIVITY_TYPES: readonly Activity["type"][] = [
  "safari",
  "water-sports",
  "cultural",
  "spa",
  "dining",
  "relaxation",
  "adventure",
  "wellness",
  "other",
];

const TRANSFER_MODES: readonly Transfer["mode"][] = ["flight", "road", "helicopter"];

const TRAVEL_STYLES: readonly GuestProfile["preferences"]["travelStyle"][] = [
  "romantic",
  "adventure",
  "relaxation",
  "cultural",
  "mixed",
];

const ACCOMMODATION_STYLES: readonly GuestProfile["preferences"]["accommodationStyle"][] = [
  "intimate-boutique",
  "luxury-resort",
  "eco-camp",
  "private-villa",
];

const ACTIVITY_LEVELS: readonly GuestProfile["preferences"]["activityLevel"][] = ["low", "moderate", "high"];
const BUDGET_RANGES: readonly GuestProfile["preferences"]["budgetRange"][] = ["premium", "ultra-luxury"];

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeAccommodationItem(raw: unknown): AccommodationItem {
  const r = asRecord(raw);
  const nights = num(r.nights);
  const ratePerNight = num(r.ratePerNight);
  return {
    label: str(r.label, "Accommodation"),
    nights,
    ratePerNight,
    ratePerNightPPPN: num(r.ratePerNightPPPN) || ratePerNight,
    subtotal: num(r.subtotal) || ratePerNight * Math.max(nights, 1),
  };
}

function normalizeActivityCostItem(raw: unknown): ActivityCostItem {
  const r = asRecord(raw);
  const item: ActivityCostItem = { label: str(r.label, "Activity"), cost: num(r.cost) };
  const model = r.pricingModel;
  if (model === "per-person" || model === "per-couple" || model === "per-booking") {
    item.pricingModel = model;
  }
  return item;
}

function normalizeTransferCostItem(raw: unknown): TransferCostItem {
  const r = asRecord(raw);
  return { label: str(r.label, "Transfer"), cost: num(r.cost) };
}

function normalizePricing(raw: unknown, fallbackTotal: number, fallbackCurrency: string): JourneyPricing {
  const r = asRecord(raw);
  const accommodation = Array.isArray(r.accommodation) ? r.accommodation.map(normalizeAccommodationItem) : [];
  const activities = Array.isArray(r.activities) ? r.activities.map(normalizeActivityCostItem) : [];
  const transfers = Array.isArray(r.transfers) ? r.transfers.map(normalizeTransferCostItem) : [];
  const subtotal = num(r.subtotal) || accommodation.reduce((sum, a) => sum + a.subtotal, 0);
  const taxes = num(r.taxes);
  const total = num(r.total) || fallbackTotal || subtotal + taxes;
  return { accommodation, activities, transfers, subtotal, taxes, total, currency: str(r.currency, fallbackCurrency) };
}

function normalizeActivity(raw: unknown): Activity {
  const r = asRecord(raw);
  return {
    time: str(r.time) || undefined,
    title: str(r.title, "Activity"),
    description: str(r.description, "Arranged by your Kivara concierge."),
    duration: str(r.duration, ""),
    included: typeof r.included === "boolean" ? r.included : true,
    type: pick(r.type, ACTIVITY_TYPES, "other"),
  };
}

function normalizeTransfer(raw: unknown): Transfer {
  const r = asRecord(raw);
  return {
    from: str(r.from, "—"),
    to: str(r.to, "—"),
    mode: pick(r.mode, TRANSFER_MODES, "road"),
    duration: str(r.duration, ""),
    cost: num(r.cost),
    currency: str(r.currency) || undefined,
    notes: str(r.notes) || undefined,
  };
}

function normalizeItinerary(raw: unknown): JourneyDay[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry, index): JourneyDay => {
    const r = asRecord(entry);
    const day = num(r.day) || index + 1;
    return {
      day,
      title: str(r.title, `Day ${day}`),
      location: str(r.location, ""),
      accommodation: str(r.accommodation, ""),
      accommodationImage: str(r.accommodationImage) || undefined,
      meals: strArray(r.meals),
      activities: Array.isArray(r.activities) ? r.activities.map(normalizeActivity) : [],
      transfers: Array.isArray(r.transfers) ? r.transfers.map(normalizeTransfer) : [],
      highlights: strArray(r.highlights),
      notes: str(r.notes) || undefined,
    };
  });
}

function buildJourney(booking: BookingRow, saved: SavedJourneyRow | null | undefined, now: Date): CuratedJourney {
  const ref = refOf(booking);
  const guests = num(booking.guestsCount) || 2;
  const currency = str(booking.currency, "USD");
  const savedPrefs = asRecord(saved?.preferences) as unknown as Partial<GuestProfile["preferences"]>;
  const pricing = normalizePricing(saved?.pricing, num(booking.totalAmount) || num(booking.finalAmount), currency);

  const guestProfile: GuestProfile = {
    id: str(booking.guestProfileId) || str(saved?.id) || ref,
    name: str(saved?.guestName) || str(booking.clientName, "Valued Guest"),
    email: str(saved?.guestEmail) || str(booking.clientEmail),
    isCouple: typeof saved?.isCouple === "boolean" ? saved.isCouple : guests >= 2,
    specialOccasion: str(saved?.specialOccasion) || undefined,
    preferences: {
      travelStyle: pick(savedPrefs.travelStyle, TRAVEL_STYLES, "romantic"),
      accommodationStyle: pick(savedPrefs.accommodationStyle, ACCOMMODATION_STYLES, "luxury-resort"),
      activityLevel: pick(savedPrefs.activityLevel, ACTIVITY_LEVELS, "moderate"),
      budgetRange: pick(savedPrefs.budgetRange, BUDGET_RANGES, "premium"),
      dietaryRestrictions: strArray(savedPrefs.dietaryRestrictions),
      interests: strArray(savedPrefs.interests),
    },
  };

  const destinations = strArray(saved?.destinations);
  const duration =
    num(saved?.duration) ||
    nightsBetween(booking.startDate, booking.endDate) ||
    pricing.accommodation.reduce((sum, a) => sum + a.nights, 0);

  return {
    id: str(saved?.id) || ref,
    title: str(saved?.title, "Your Kivara Journey"),
    subtitle: str(saved?.subtitle, "A journey curated around your story"),
    guestProfile,
    destinations: destinations.length > 0 ? destinations : [str(booking.destination, "Zambia")],
    duration,
    pricing,
    itinerary: normalizeItinerary(saved?.itinerary),
    highlights: strArray(saved?.highlights),
    includedExtras: strArray(saved?.includedExtras),
    createdAt: str(saved?.createdAt, now.toISOString()),
    status: "confirmed",
  };
}

// ─── Per-document builders ───────────────────────────────────────────────

function buildInvoice(booking: BookingRow, ctx: BuildContext): InvoiceData {
  const ref = refOf(booking);
  const now = ctx.now ?? new Date();
  const currency = str(booking.currency, "USD");
  const total = num(booking.totalAmount) || num(booking.finalAmount);
  return {
    invoiceNumber: `INV-${ref}`,
    bookingRef: ref,
    clientName: str(booking.clientName, "Valued Guest"),
    clientEmail: str(booking.clientEmail),
    issueDate: todayIso(now),
    dueDate: toIsoDate(booking.balanceDueDate) || toIsoDate(booking.startDate) || todayIso(now),
    lineItems: [
      {
        description: `${destinationLabel(booking)} — Kivara curated journey`,
        quantity: 1,
        unitPrice: total,
        total,
      },
    ],
    subtotal: total,
    taxRate: 0,
    taxAmount: 0,
    discountAmount: num(booking.discountAmount) || undefined,
    totalAmount: total,
    currency,
    notes: str(booking.specialRequests) || undefined,
    paymentReference: `${ref}-BAL`,
    paypalLink: setting(ctx.settings, "paypal_link") || undefined,
    bankDetails: bankFromSettings(ctx.settings),
  };
}

function buildReceipt(booking: BookingRow, ctx: BuildContext): ReceiptDocumentData {
  const ref = refOf(booking);
  const now = ctx.now ?? new Date();
  const total = num(booking.totalAmount) || num(booking.finalAmount);
  const deposit = num(booking.depositAmount);
  const balance = num(booking.balanceAmount) || Math.max(0, total - deposit);
  const paid = deposit > 0 ? deposit : total;
  return {
    receiptRef: `RCP-${ref}`,
    bookingRef: ref,
    clientName: str(booking.clientName, "Valued Guest"),
    clientEmail: str(booking.clientEmail),
    amount: paid,
    currency: str(booking.currency, "USD"),
    paymentMethod: str(booking.depositMethod, "Wire Transfer"),
    paidAt: now.toISOString(),
    type: deposit > 0 ? "deposit" : "full",
    balanceRemaining: balance > 0 ? balance : undefined,
  };
}

function buildPaymentReminder(booking: BookingRow, ctx: BuildContext): PaymentReminderData {
  const ref = refOf(booking);
  const now = ctx.now ?? new Date();
  const total = num(booking.totalAmount) || num(booking.finalAmount);
  const deposit = num(booking.depositAmount);
  const balance = num(booking.balanceAmount) || Math.max(0, total - deposit);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  return {
    clientName: str(booking.clientName, "Valued Guest"),
    bookingRef: ref,
    amountDue: balance || total,
    currency: str(booking.currency, "USD"),
    dueDate: toIsoDate(booking.balanceDueDate) || toIsoDate(booking.startDate) || todayIso(now),
    paymentType: "balance",
    paymentLink: setting(ctx.settings, "payment_link") || setting(ctx.settings, "paypal_link") || `${siteUrl}/contact`,
    paymentReference: `${ref}-BAL`,
    bankDetails: bankFromSettings(ctx.settings),
  };
}

function buildTravelBrief(booking: BookingRow, _ctx: BuildContext): TravelBriefData {
  const ref = refOf(booking);
  const dates = [toIsoDate(booking.startDate), toIsoDate(booking.endDate)].filter(Boolean);
  return {
    clientName: str(booking.clientName, "Valued Guest"),
    bookingRef: ref,
    destination: destinationLabel(booking),
    travelDates: dates.length > 0 ? dates.join(" → ") : "To be confirmed",
    accommodation: "As arranged by your Kivara concierge",
    emergencyContact: "24/7 Concierge · concierge@kivara.africa · +27 87 123 4567",
    weather:
      "Warm, sunny days and cooler evenings. Pack layers for early-morning game drives and a hat for the midday sun.",
    currency: "US Dollar (USD) is widely accepted; Zambian Kwacha (ZMW) for local purchases.",
    language: "English is the official language, with local languages spoken throughout.",
    timezone: "Central Africa Time (CAT, UTC+2)",
    visaRequirements:
      "Most guests require a visa or e-visa for Zambia. Please confirm current requirements with your nearest Zambian embassy well before departure — Kivara is happy to provide an invitation letter on request.",
    healthAdvice:
      "Consult your travel clinic about malaria prophylaxis and routine vaccinations at least six weeks before travel, and bring any personal medication in its original packaging.",
    packingTips: [
      "Lightweight, neutral-coloured clothing for game drives",
      "A warm layer for early mornings and evening drives",
      "Sun hat, sunglasses and high-SPF sunscreen",
      "Insect repellent and any personal medication",
      "Binoculars and a camera with spare batteries",
      "Comfortable walking shoes for bush walks",
    ],
  };
}

/**
 * Build the payload a document generator expects from a booking row. Returns a
 * plain record because the generators receive `Record<string, unknown>` and
 * narrow internally.
 */
export function buildDocumentData(
  type: BookingDocumentType,
  booking: BookingRow,
  ctx: BuildContext = {}
): Record<string, unknown> {
  switch (type) {
    case "invoice":
      return buildInvoice(booking, ctx) as unknown as Record<string, unknown>;
    case "receipt":
      return buildReceipt(booking, ctx) as unknown as Record<string, unknown>;
    case "payment-reminder":
      return buildPaymentReminder(booking, ctx) as unknown as Record<string, unknown>;
    case "travel-brief":
      return buildTravelBrief(booking, ctx) as unknown as Record<string, unknown>;
    case "itinerary":
      return buildJourney(booking, ctx.journey, ctx.now ?? new Date()) as unknown as Record<string, unknown>;
    case "welcome":
    case "thank-you":
      return {
        clientName: str(booking.clientName, "Valued Guest"),
        bookingRef: refOf(booking),
        destination: destinationLabel(booking),
      };
  }
}
