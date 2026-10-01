// Shared data-access + report contract for the analytical agent layer.
//
// ── WHY A SHARED CONTRACT ─────────────────────────────────────────────────────
// The 22 agents in AGENT_RUNTIME with status "analytical" (formerly "declared")
// are, by their own registry entries, read-only recommend-only roles. Their
// `tools` are read_* plus occasionally `llm`; their `permissions` are almost all
// "Read-only; recommend only". So the honest implementation is not an
// autonomous actor but a deterministic analyzer over real platform data.
//
// The danger with 22 report generators is fabrication: an agent asked for
// campaign performance when the platform has no campaign-spend table will
// cheerfully produce plausible numbers, and a founder cannot tell them from real
// ones. So EVERY report here carries the two fields that make that impossible to
// hide:
//
//   evidenceBasis      the real rows/columns the numbers were computed from
//   unavailableInputs  what the agent needed and the platform does not have
//
// An agent that needed a competitor price list and has none reports that it has
// none. It does not estimate one. `dataAvailability` is derived from those two
// fields rather than asserted, so it cannot drift out of sync with the truth.
//
// Numbers are always computed from the snapshot. LLMs are only ever asked to
// phrase an already-computed finding, and their failure is non-fatal.

import { createAdminClient } from "@/lib/supabase/admin";

export type DataAvailability = "full" | "partial" | "unavailable";

/** Every analytical agent returns this envelope. */
export interface AgentReport<TFindings = unknown> {
  agent: string;
  findings: TFindings;
  /** Real inputs the findings were derived from. Empty when nothing was usable. */
  evidenceBasis: string[];
  /** Inputs the agent required that the platform does not record. */
  unavailableInputs: string[];
  dataAvailability: DataAvailability;
  /**
   * True when the report contains a recommendation the registry reserves for a
   * human. The registry escalation field is what decides this, not the agent.
   */
  requiresHumanApproval: boolean;
}

export interface AgentEnvelope {
  agent: string;
  evidenceBasis: string[];
  unavailableInputs: string[];
  requiresHumanApproval: boolean;
}

function availabilityOf(evidence: string[], unavailable: string[]): DataAvailability {
  if (evidence.length === 0) return "unavailable";
  return unavailable.length > 0 ? "partial" : "full";
}

/**
 * Build a report, deriving dataAvailability rather than trusting a caller to set
 * it. A report that claims "full" while naming missing inputs is a bug, and this
 * makes that unrepresentable.
 */
export function report<TFindings>(
  envelope: AgentEnvelope,
  findings: TFindings
): AgentReport<TFindings> {
  return {
    agent: envelope.agent,
    findings,
    evidenceBasis: envelope.evidenceBasis,
    unavailableInputs: envelope.unavailableInputs,
    dataAvailability: availabilityOf(envelope.evidenceBasis, envelope.unavailableInputs),
    requiresHumanApproval: envelope.requiresHumanApproval,
  };
}

// ─── Snapshots ────────────────────────────────────────────────────────────────
// Reads are narrow and explicit rather than SELECT *, so a column rename surfaces
// as a type error here instead of as a silently undefined value inside a report.

export interface SupplierFact {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  status: string | null;
  rating: number | null;
  commissionRate: number | null;
  contractOnFile: boolean | null;
  insuranceOnFile: boolean | null;
  certifications: string[];
}

export interface JourneyFact {
  id: string;
  name: string;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  destinations: string[];
  travellers: number | null;
  sellingPrice: number | null;
  supplierCost: number | null;
}

export interface ItineraryItemFact {
  id: string;
  journeyId: string | null;
  day: number | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  title: string;
  location: string | null;
  destination: string | null;
  category: string | null;
  supplierId: string | null;
  bookingStatus: string | null;
  confirmationNumber: string | null;
  cost: number | null;
  sellingPrice: number | null;
}

export interface FunnelFact {
  inquiries: number;
  bookings: number;
  inquiryStatuses: Record<string, number>;
  bookingStatuses: Record<string, number>;
  /** Real acquisition channels from inquiries.source, not a marketing-tool guess. */
  sources: Record<string, number>;
  /** Bookings attributed to each acquisition source, via bookings.inquiry_id. */
  bookingsBySource: Record<string, number>;
  destinationsRequested: Record<string, number>;
  bookedDestinations: Record<string, number>;
  revenue: number;
  averageBookingValue: number;
  /** Median days from inquiry to booking, over inquiries that actually converted. */
  medianDaysToBook: number | null;
  convertedInquiries: number;
}

export interface GuestFact {
  id: string;
  name: string | null;
  email: string | null;
  bookings: number;
  lastContactedAt: string | null;
  totalSpend: number;
  isVip: boolean | null;
  source: string | null;
  tags: string[];
  interests: string[];
  wishlist: string[];
  specialOccasion: string | null;
  travelStyle: string | null;
  activityLevel: string | null;
  budgetRange: string | null;
  notes: string | null;
  lastTripDate: string | null;
}

/**
 * A table the snapshot could not read, and why.
 *
 * This exists to stop the most dangerous failure mode in the layer: a read that
 * errors and degrades to `[]` is indistinguishable from a table that is genuinely
 * empty. Without this, a permissions error on `bookings` renders "revenue 0,
 * zero bookings" and cites `postgres:bookings` as evidence - the platform
 * inventing a fact about itself. A failed read must be reported as unavailable.
 */
export interface ReadFailure {
  table: string;
  reason: string;
}

export interface PlatformSnapshot {
  suppliers: SupplierFact[];
  journeys: JourneyFact[];
  itineraryItems: ItineraryItemFact[];
  tours: { id: string; title: string; destination: string | null; category: string | null; isActive: boolean | null }[];
  destinations: { slug: string; name: string; tagline: string | null }[];
  funnel: FunnelFact;
  guests: GuestFact[];
  /**
   * Tables this snapshot could not read. Empty when every read succeeded.
   * Agent cores are pure and need not consult it - the runner reconciles
   * reports against it - but it is on the snapshot so a test can build one.
   */
  readFailures: ReadFailure[];
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function numOr(v: unknown, fallback: number): number {
  return num(v) ?? fallback;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function bool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v === null || v === undefined) return null;
  return Boolean(v);
}

function strArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

function tally<T extends string>(rows: T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of rows) out[key] = (out[key] ?? 0) + 1;
  return out;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(value * 10) / 10;
}

function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round(((b - a) / 86_400_000) * 10) / 10;
}

const SUPPLIER_COLUMNS =
  "id, name, country, city, status, rating, commission_rate, contract_on_file, insurance_on_file, certifications";
const JOURNEY_COLUMNS =
  "id, journey_name, status, start_date, end_date, duration_days, destinations, number_of_travellers, total_selling_price, total_supplier_cost";
const ITINERARY_COLUMNS =
  "id, journey_id, itinerary_day, date, start_time, end_time, title, location, destination, category, supplier_id, booking_status, confirmation_number, cost, selling_price";
const INQUIRY_COLUMNS = "id, status, destination, source, created_at, first_response_at, response_count, budget_range";
const BOOKING_COLUMNS =
  "id, status, destination, final_amount, total_amount, created_at, inquiry_id, guest_profile_id, guests_count, booking_reference";
const GUEST_COLUMNS =
  "id, full_name, email, notes, created_at, last_contacted_at, last_trip_date, total_bookings, total_spent, is_vip, source, tags, interests, wishlist, special_occasion, travel_style, activity_level, budget_range";

/**
 * Every table `readPlatformSnapshot` reads, and therefore the complete set of
 * tables any agent may legitimately cite in `evidenceBasis`.
 *
 * This is the single source of truth for that rule, and it is enforced rather
 * than merely documented: `analytical.test.ts` fails if any report cites a
 * `postgres:<table>` outside this list. A cited table that was never read is a
 * fabricated evidence claim - it tells the reader a number came from the
 * database when it came from nowhere.
 */
export const SNAPSHOT_TABLES = [
  "suppliers",
  "journeys",
  "itinerary_items",
  "tours",
  "destinations",
  "inquiries",
  "bookings",
  "guest_profiles",
] as const;

/**
 * Read one coherent snapshot of everything the analytical agents need.
 *
 * A single call keeps the 22 reports comparable: two agents can never disagree
 * about how many bookings exist because they read at different moments. Every
 * read degrades to an empty array on error rather than throwing, because a
 * failed read must leave the report saying "partial" instead of taking down the
 * admin page that renders it.
 *
 * Degrading to an empty array is NOT the same as the table being empty, so every
 * error is recorded in `readFailures`. The runner reconciles every report
 * against that list, which is what stops a permissions error from being
 * published as "revenue 0, zero bookings".
 */
export async function readPlatformSnapshot(): Promise<PlatformSnapshot> {
  const supabase = createAdminClient();

  const [suppliersR, journeysR, itemsR, toursR, destinationsR, inquiriesR, bookingsR, guestsR] =
    await Promise.all([
      supabase.from("suppliers").select(SUPPLIER_COLUMNS).limit(2000),
      supabase.from("journeys").select(JOURNEY_COLUMNS).limit(2000),
      supabase.from("itinerary_items").select(ITINERARY_COLUMNS).limit(10000),
      supabase.from("tours").select("id, title, destination, category, is_active").limit(2000),
      supabase.from("destinations").select("slug, name, tagline").limit(500),
      supabase.from("inquiries").select(INQUIRY_COLUMNS).limit(5000),
      supabase.from("bookings").select(BOOKING_COLUMNS).limit(5000),
      supabase.from("guest_profiles").select(GUEST_COLUMNS).limit(2000),
    ]);

  const readFailures: ReadFailure[] = [];
  const noteFailure = (table: string, error: { message: string } | null) => {
    if (error) readFailures.push({ table, reason: error.message });
  };
  noteFailure("suppliers", suppliersR.error);
  noteFailure("journeys", journeysR.error);
  noteFailure("itinerary_items", itemsR.error);
  noteFailure("tours", toursR.error);
  noteFailure("destinations", destinationsR.error);
  noteFailure("inquiries", inquiriesR.error);
  noteFailure("bookings", bookingsR.error);
  noteFailure("guest_profiles", guestsR.error);

  const suppliers: SupplierFact[] = (suppliersR.data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? "Unnamed supplier"),
    country: str(r.country),
    city: str(r.city),
    status: str(r.status),
    rating: num(r.rating),
    commissionRate: num(r.commission_rate),
    contractOnFile: bool(r.contract_on_file),
    insuranceOnFile: bool(r.insurance_on_file),
    certifications: strArray(r.certifications),
  }));

  const journeys: JourneyFact[] = (journeysR.data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.journey_name ?? "Untitled journey"),
    status: str(r.status),
    startDate: str(r.start_date),
    endDate: str(r.end_date),
    durationDays: num(r.duration_days),
    destinations: strArray(r.destinations),
    travellers: num(r.number_of_travellers),
    sellingPrice: num(r.total_selling_price),
    supplierCost: num(r.total_supplier_cost),
  }));

  const itineraryItems: ItineraryItemFact[] = (itemsR.data ?? []).map((r) => ({
    id: String(r.id),
    journeyId: r.journey_id ? String(r.journey_id) : null,
    day: num(r.itinerary_day),
    date: str(r.date),
    startTime: str(r.start_time),
    endTime: str(r.end_time),
    title: String(r.title ?? "Untitled item"),
    location: str(r.location),
    destination: str(r.destination),
    category: str(r.category),
    supplierId: r.supplier_id ? String(r.supplier_id) : null,
    bookingStatus: str(r.booking_status),
    confirmationNumber: str(r.confirmation_number),
    cost: num(r.cost),
    sellingPrice: num(r.selling_price),
  }));

  const tours = (toursR.data ?? []).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? "Untitled tour"),
    destination: str(r.destination),
    category: str(r.category),
    isActive: bool(r.is_active),
  }));

  const destinations = (destinationsR.data ?? []).map((r) => ({
    slug: String(r.slug),
    name: String(r.name ?? r.slug),
    tagline: str(r.tagline),
  }));

  const inquiries = inquiriesR.data ?? [];
  const bookings = bookingsR.data ?? [];

  const revenue = bookings.reduce(
    (sum, b) => sum + numOr(b.final_amount ?? b.total_amount, 0),
    0
  );

  // bookings.inquiry_id is a real FK, so an inquiry can be attributed to the
  // booking it produced without guessing at a join. Where it is null the
  // booking is unattributable and is excluded rather than credited to whichever
  // inquiry happens to be first.
  const inquiryById = new Map(inquiries.map((r) => [String(r.id), r]));
  const attribution: { source: string; days: number | null }[] = [];
  for (const booking of bookings) {
    const inquiryId = booking.inquiry_id ? String(booking.inquiry_id) : null;
    const inquiry = inquiryId ? inquiryById.get(inquiryId) : undefined;
    if (!inquiry) continue;
    const from = str(inquiry.created_at);
    const to = str(booking.created_at);
    attribution.push({
      source: str(inquiry.source) ?? "unknown",
      days: from && to ? daysBetween(from, to) : null,
    });
  }

  const medianDaysToBook = median(
    attribution.map((a) => a.days).filter((d): d is number => d !== null)
  );

  const sources = tally(inquiries.map((r) => str(r.source) ?? "unknown"));
  const bookingsBySource = tally(attribution.map((a) => a.source));

  const funnel: FunnelFact = {
    inquiries: inquiries.length,
    bookings: bookings.length,
    inquiryStatuses: tally(inquiries.map((r) => str(r.status) ?? "unknown")),
    bookingStatuses: tally(bookings.map((r) => str(r.status) ?? "unknown")),
    sources,
    bookingsBySource,
    destinationsRequested: tally(
      inquiries.map((r) => str(r.destination) ?? "unspecified")
    ),
    bookedDestinations: tally(bookings.map((r) => str(r.destination) ?? "unspecified")),
    revenue,
    averageBookingValue: bookings.length > 0 ? Math.round(revenue / bookings.length) : 0,
    medianDaysToBook,
    convertedInquiries: attribution.length,
  };

  const bookingsByGuest = new Map<string, number>();
  for (const booking of bookings) {
    const guestId = booking.guest_profile_id ? String(booking.guest_profile_id) : null;
    if (!guestId) continue;
    bookingsByGuest.set(guestId, (bookingsByGuest.get(guestId) ?? 0) + 1);
  }

  const guests: GuestFact[] = (guestsR.data ?? []).map((r) => {
    const id = String(r.id);
    return {
      id,
      name: str(r.full_name),
      email: str(r.email),
      // Prefer the denormalised counter, but fall back to the real booking count
      // when the counter was never incremented.
      bookings: numOr(r.total_bookings, bookingsByGuest.get(id) ?? 0),
      lastContactedAt: str(r.last_contacted_at),
      totalSpend: numOr(r.total_spent, 0),
      isVip: bool(r.is_vip),
      source: str(r.source),
      tags: strArray(r.tags),
      interests: strArray(r.interests),
      wishlist: strArray(r.wishlist),
      specialOccasion: str(r.special_occasion),
      travelStyle: str(r.travel_style),
      activityLevel: str(r.activity_level),
      budgetRange: str(r.budget_range),
      notes: str(r.notes),
      lastTripDate: str(r.last_trip_date),
    };
  });

  return {
    suppliers,
    journeys,
    itineraryItems,
    tours,
    destinations,
    funnel,
    guests,
    readFailures,
  };
}

/**
 * Reconcile a report against the tables the snapshot could not read.
 *
 * An agent names the tables it consulted in `evidenceBasis` via `evidenceFor`.
 * If one of those reads actually failed, the claim is false: the agent did not
 * derive anything from `postgres:bookings`, it received an empty array. This
 * moves that table from evidence to `unavailableInputs` and re-derives
 * availability, so a report can never cite a table it did not actually read.
 *
 * Applied by the runner rather than by each core, so no agent can forget it.
 */
export function applyReadFailures(
  report: AgentReport<unknown>,
  readFailures: readonly ReadFailure[]
): AgentReport<unknown> {
  if (readFailures.length === 0) return report;

  const failed = new Set(readFailures.map((f) => f.table));
  const evidenceBasis = report.evidenceBasis.filter((e) => {
    const match = /^postgres:(.+)$/.exec(e);
    return !(match && failed.has(match[1]));
  });

  const removed = report.evidenceBasis.length - evidenceBasis.length;
  if (removed === 0) return report;

  const notes = readFailures
    .filter((f) => report.evidenceBasis.includes(`postgres:${f.table}`))
    .map((f) => `postgres:${f.table} (read failed: ${f.reason})`);

  return {
    ...report,
    evidenceBasis,
    unavailableInputs: [...report.unavailableInputs, ...notes],
    dataAvailability: availabilityOf(evidenceBasis, [...report.unavailableInputs, ...notes]),
  };
}

/** Evidence label for a table that the snapshot read. */
export function evidenceFor(...tables: string[]): string[] {
  return tables.map((t) => `postgres:${t}`);
}
