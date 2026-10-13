// ─── Kivara Pipeline Registration Service ──────────────────────────────
// Closes the automation chain between back-office modules. Each function is
// IDEMPOTENT: registering the same enquiry / journey / proposal twice never
// produces a duplicate lead, journey, proposal, booking or invoice.
//
//   enquiries → leads             registerLeadFromInquiry
//   journeys → proposals          registerJourneyFromSavedJourney
//   journeys → itinerary_items    registerJourneyFromSavedJourney
//   itinerary → suppliers         registerSupplierMatchesForJourney
//   itinerary → pricing           registerJourneyPricing
//   proposals → human review      registerProposalReviewStage
//   proposals → bookings          registerBookingFromProposal
//   bookings  → supplier confirm  registerSupplierReservationsForBooking
//   bookings  → trip delivery     registerTripDelivery
//   bookings  → finance           registerFinanceFromBooking
//   bookings  → feedback          registerGuestFeedback
//   bookings  → concierge need    registerConciergeRequest
//   ops       → team task         registerTaskStage (created / completed)
//
// Every function is non-fatal on its own failure (the operation that
// triggered it — saving an enquiry, marking a proposal sent, confirming a
// payment — must never roll back because a downstream registration failed),
// but failures are returned so callers can log them.

import { createAdminClient } from "@/lib/supabase/admin";
import { joinSingle } from "@/lib/api-helpers";
import { recordEvent } from "@/lib/ai/event-bus";

/** A curated day from the AI journey engine (subset of JourneyDay). */
export interface CuratedDay {
  day: number;
  title: string;
  location: string;
  accommodation?: string;
  activities?: { type?: string; title?: string }[];
  notes?: string;
}

/** Pricing summary from the curated journey (subset of JourneyPricing). */
export interface CuratedPricing {
  total?: number;
  currency?: string;
  subtotal?: number;
  taxes?: number;
}

export interface RegisterJourneyResult {
  journeyId: string | null;
  proposalId: string | null;
  itineraryItemCount: number;
  registered: boolean;
  error: string | null;
}

export interface RegisterBookingResult {
  bookingId: string | null;
  bookingReference: string | null;
  registered: boolean;
  error: string | null;
}

export interface RegisterFinanceResult {
  invoiceId: string | null;
  invoiceNumber: string | null;
  registered: boolean;
  error: string | null;
}

// ─── Pure mapping helpers (unit-testable without a database) ─────────────

/**
 * Map a curated journey day to an itinerary_items insert row. `date` is
 * nullable — the migration relaxed the column so dateless journeys can still
 * register an itinerary. Sort order follows itinerary day.
 */
export function mapCuratedDayToItineraryItem(
  journeyId: string,
  day: CuratedDay,
  date: string | null,
  currency: string
): Record<string, unknown> {
  const activityType = day.activities?.[0]?.type ?? "experience";
  const category =
    activityType === "dining" || activityType === "spa" ? "dining" : activityType === "cultural" ? "cultural" : "experience";
  return {
    journey_id: journeyId,
    itinerary_day: day.day,
    date,
    location: day.location || null,
    category,
    title: day.title,
    description: day.notes || null,
    customer_facing_description: day.activities?.[0]?.title || day.notes || null,
    selling_price: 0,
    cost: 0,
    currency,
    sort_order: day.day,
  };
}

/**
 * Compute proposal financials from a curated journey. Deposit defaults to 30%
 * of the total (matches the platform's default deposit rate) and the balance
 * is the remainder. Returns zeros when no total is present.
 */
export function computeProposalFinancials(pricing: CuratedPricing) {
  const total = Number(pricing.total) || 0;
  const deposit = Math.round(total * 0.3 * 100) / 100;
  return {
    totalInvestment: total,
    depositAmount: deposit,
    balanceAmount: Math.round((total - deposit) * 100) / 100,
    currency: pricing.currency || "USD",
  };
}

// ─── Registration functions ───────────────────────────────────────────────

/**
 * Step 1 — ENQUIRY → LEAD.
 * Create a lead row for an enquiry, linked via inquiry_id, unless one already
 * exists (idempotent by inquiry_id, then by email fallback so the same guest
 * does not accumulate duplicate leads).
 */
export async function registerLeadFromInquiry(
  inquiryId: string,
  options?: { guestProfileId?: string | null; source?: string | null }
): Promise<{ leadId: string | null; registered: boolean; error: string | null }> {
  const db = createAdminClient();
  try {
    const { data: inquiry, error: inquiryError } = await db
      .from("inquiries")
      .select("id, full_name, email, phone, destination, preferred_dates, guests, message, source")
      .eq("id", inquiryId)
      .single();

    if (inquiryError || !inquiry) {
      return { leadId: null, registered: false, error: inquiryError?.message || "Inquiry not found" };
    }

    // Already registered for this inquiry?
    const { data: existingByInquiry } = await db
      .from("leads")
      .select("id")
      .eq("inquiry_id", inquiryId)
      .maybeSingle();

    if (existingByInquiry) {
      return { leadId: existingByInquiry.id, registered: false, error: null };
    }

    // Fallback: same email already on file? Link rather than duplicate.
    const { data: existingByEmail } = await db
      .from("leads")
      .select("id")
      .eq("email", inquiry.email)
      .maybeSingle();

    if (existingByEmail) {
      await db.from("leads").update({ inquiry_id: inquiryId }).eq("id", existingByEmail.id);
      return { leadId: existingByEmail.id, registered: false, error: null };
    }

    const { data: lead, error: leadError } = await db
      .from("leads")
      .insert({
        full_name: inquiry.full_name,
        email: inquiry.email,
        phone: inquiry.phone || null,
        country: null,
        preferred_destinations: inquiry.destination ? [inquiry.destination] : [],
        source: inquiry.source || options?.source || "website",
        inquiry_id: inquiryId,
        guest_profile_id: options?.guestProfileId || null,
        lead_status: "new",
        priority: "medium",
        story: inquiry.message || null,
      })
      .select("id")
      .single();

    if (leadError || !lead) {
      return { leadId: null, registered: false, error: leadError?.message || "Lead insert failed" };
    }

    await recordEvent({
      eventType: "CLIENT_PROFILED",
      entityType: "lead",
      entityId: lead.id,
      actorType: "system",
      correlationId: inquiryId,
      payload: { inquiryId, source: inquiry.source || "website" },
      autonomyLevel: 1,
    });

    return { leadId: lead.id, registered: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { leadId: null, registered: false, error: message };
  }
}

/**
 * Steps 2+3 — AI JOURNEY → OPERATIONAL JOURNEY + PROPOSAL + ITINERARY.
 * Given a saved_journeys row (the AI-curated document), register:
 *   1. an operational `journeys` row (status `designing`)
 *   2. `itinerary_items` rows for each curated day
 *   3. a `proposals` draft linked via journey_id
 * Idempotent: a journey already linked from this saved journey is returned
 * untouched; an existing proposal for the journey is never duplicated.
 *
 * A valid `date` for itinerary items is resolved from the journey dates when
 * available, otherwise NULL (the column now allows it).
 */
export async function registerJourneyFromSavedJourney(
  savedJourneyId: string,
  options?: { inquiryId?: string | null; explicitDate?: string | null }
): Promise<RegisterJourneyResult> {
  const db = createAdminClient();
  try {
    const { data: sj, error: sjError } = await db
      .from("saved_journeys")
      .select("id, title, subtitle, quote_ref, guest_profile_id, guest_email, is_couple, destinations, duration, itinerary, pricing, journey_id")
      .eq("id", savedJourneyId)
      .single();

    if (sjError || !sj) {
      return { journeyId: null, proposalId: null, itineraryItemCount: 0, registered: false, error: sjError?.message || "Saved journey not found" };
    }

    // Idempotent: already registered.
    if (sj.journey_id) {
      return { journeyId: sj.journey_id, proposalId: null, itineraryItemCount: 0, registered: false, error: null };
    }

    const total = Number(sj.pricing?.total) || 0;
    const currency: string = sj.pricing?.currency || "USD";
    const destinations = Array.isArray(sj.destinations) ? sj.destinations : [];

    // Resolve the lead (by inquiry, then by guest email) so the journey is
    // linked into the CRM chain.
    let leadId: string | null = null;
    if (options?.inquiryId) {
      const { data: lead } = await db.from("leads").select("id").eq("inquiry_id", options.inquiryId).maybeSingle();
      leadId = lead?.id ?? null;
    }
    if (!leadId && sj.guest_email) {
      const { data: lead } = await db.from("leads").select("id").eq("email", sj.guest_email).maybeSingle();
      leadId = lead?.id ?? null;
    }

    // Resolve the guest profile so bookings later carry guest_profile_id.
    let customerId: string | null = null;
    if (sj.guest_profile_id) {
      customerId = sj.guest_profile_id;
    } else if (sj.guest_email) {
      const { data: guest } = await db.from("guest_profiles").select("id").eq("email", sj.guest_email).maybeSingle();
      customerId = guest?.id ?? null;
    }

    // 1. Create the operational journey.
    const { data: journey, error: journeyError } = await db
      .from("journeys")
      .insert({
        journey_name: sj.title || "Untitled Journey",
        internal_reference: sj.quote_ref || null,
        customer_id: customerId,
        lead_id: leadId,
        number_of_travellers: sj.is_couple ? 2 : 1,
        destinations,
        duration_days: sj.duration || null,
        total_selling_price: total,
        gross_margin: 0,
        currency,
        status: "designing",
        customer_notes: sj.subtitle || null,
      })
      .select("id")
      .single();

    if (journeyError || !journey) {
      return { journeyId: null, proposalId: null, itineraryItemCount: 0, registered: false, error: journeyError?.message || "Journey insert failed" };
    }

    await db.from("saved_journeys").update({ journey_id: journey.id }).eq("id", savedJourneyId);

    // 2. Register itinerary_items from the curated days.
    let itineraryItemCount = 0;
    const itinerary = Array.isArray(sj.itinerary) ? (sj.itinerary as unknown as CuratedDay[]) : [];
    const resolvedDate = options?.explicitDate || null;
    if (itinerary.length > 0) {
      const rows = itinerary.map((day) => mapCuratedDayToItineraryItem(journey.id, day, resolvedDate, currency));
      const { error: itemError } = await db.from("itinerary_items").insert(rows);
      if (!itemError) itineraryItemCount = rows.length;
    }

    // 3. Register the proposal draft — but never twice for this journey.
    const { data: existingProposal } = await db
      .from("proposals")
      .select("id")
      .eq("journey_id", journey.id)
      .maybeSingle();

    let proposalId: string | null = null;
    if (!existingProposal) {
      const financials = computeProposalFinancials(sj.pricing ?? {});
      const { data: proposal, error: proposalError } = await db
        .from("proposals")
        .insert({
          title: sj.title || "Journey Proposal",
          journey_id: journey.id,
          customer_id: customerId,
          lead_id: leadId,
          journey_summary: sj.subtitle || null,
          itinerary_description: itinerary.map((d) => `Day ${d.day}: ${d.title}`).join("\n") || null,
          total_investment: financials.totalInvestment,
          deposit_amount: financials.depositAmount,
          balance_amount: financials.balanceAmount,
          currency: financials.currency,
          status: "draft",
        })
        .select("id")
        .single();

      if (proposalError || !proposal) {
        return {
          journeyId: journey.id,
          proposalId: null,
          itineraryItemCount,
          registered: true,
          error: proposalError?.message || "Proposal insert failed",
        };
      }
      proposalId = proposal.id;
    } else {
      proposalId = existingProposal.id;
    }

    await recordEvent({
      eventType: "JOURNEY_DESIGNED",
      entityType: "journey",
      entityId: journey.id,
      actorType: "system",
      correlationId: options?.inquiryId || null,
      payload: { savedJourneyId, source: "ai-journeys" },
      autonomyLevel: 1,
    });
    await recordEvent({
      eventType: "PROPOSAL_GENERATED",
      entityType: "proposal",
      entityId: proposalId || undefined,
      actorType: "system",
      correlationId: options?.inquiryId || null,
      payload: { journeyId: journey.id, status: "draft" },
      autonomyLevel: 1,
    });

    return { journeyId: journey.id, proposalId, itineraryItemCount, registered: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { journeyId: null, proposalId: null, itineraryItemCount: 0, registered: false, error: message };
  }
}

/**
 * Steps 4+5 — PROPOSAL SENT → BOOKING.
 * Creates a provisional booking for a proposal that has been marked `sent`,
 * linked back through journey → lead → inquiry and forward into bookings.
 * Idempotent by bookings.proposal_id.
 */
export async function registerBookingFromProposal(
  proposalId: string
): Promise<RegisterBookingResult> {
  const db = createAdminClient();
  try {
    const { data: proposal, error: proposalError } = await db
      .from("proposals")
      .select("*, journeys(*, leads(*))")
      .eq("id", proposalId)
      .single();

    if (proposalError || !proposal) {
      return { bookingId: null, bookingReference: null, registered: false, error: proposalError?.message || "Proposal not found" };
    }

    const { data: existingBooking } = await db
      .from("bookings")
      .select("id, booking_reference")
      .eq("proposal_id", proposalId)
      .maybeSingle();

    if (existingBooking) {
      return {
        bookingId: existingBooking.id,
        bookingReference: existingBooking.booking_reference,
        registered: false,
        error: null,
      };
    }

    const journey = joinSingle(proposal.journeys as Record<string, unknown> | Record<string, unknown>[]) ?? null;
    const lead = journey ? joinSingle(journey.leads as Record<string, unknown> | Record<string, unknown>[]) : null;

    const inquiryId: string | null = (lead?.inquiry_id as string | null) ?? null;
    const customerId: string | null =
      (proposal.customer_id as string | null) ?? (journey?.customer_id as string | null) ?? null;
    const clientName = String(
      (proposal.lead_id && (lead?.full_name as string | undefined)) || (proposal.title as string | undefined) || "Guest"
    );
    const destinations = Array.isArray(journey?.destinations) ? (journey.destinations as string[]) : [];
    const duration = Number(journey?.duration_days) || null;
    const currency = (proposal.currency as string) || "USD";
    const totalAmount = Number(proposal.total_investment) || 0;
    const depositAmount = Number(proposal.deposit_amount) || 0;
    const balanceAmount = Number(proposal.balance_amount) || 0;

    // Resolve a client email (bookings.client_email is NOT NULL). Prefer the
    // lead, then the proposal's sent_to_email, then the guest profile.
    let clientEmail: string | null = (lead?.email as string | null) ?? null;
    if (!clientEmail && proposal.sent_to_email) clientEmail = String(proposal.sent_to_email);
    if (!clientEmail && customerId) {
      const { data: guest } = await db.from("guest_profiles").select("email").eq("id", customerId).maybeSingle();
      clientEmail = guest?.email ?? null;
    }
    if (!clientEmail) {
      return {
        bookingId: null,
        bookingReference: null,
        registered: false,
        error: "Cannot register booking: no client email (lead, sent_to_email, or guest profile)",
      };
    }

    // booking_reference is generated by the `set_booking_reference` trigger
    // (migration 002) — do not set it here; read the trigger value back.
    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .insert({
        proposal_id: proposalId,
        journey_id: (journey?.id as string | null) ?? null,
        inquiry_id: inquiryId,
        guest_profile_id: customerId,
        status: "provisional",
        client_name: clientName.slice(0, 255),
        client_email: String(clientEmail).slice(0, 255),
        destination: destinations[0] || null,
        duration_nights: duration,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
        currency,
        source: "proposal",
      })
      .select()
      .single();

    if (bookingError || !booking) {
      return { bookingId: null, bookingReference: null, registered: false, error: bookingError?.message || "Booking insert failed" };
    }

    // Mark the originating records.
    if (inquiryId) {
      await db
        .from("inquiries")
        .update({ status: "booked", converted_to_booking_id: booking.id, booking_id: booking.id })
        .eq("id", inquiryId);
    }
    if (journey) {
      await db.from("journeys").update({ status: "proposal_sent" }).eq("id", journey.id as string);
    }
    if (lead) {
      await db.from("leads").update({ lead_status: "booking" }).eq("id", lead.id as string);
    }

    await recordEvent({
      eventType: "CLIENT_ACCEPTED",
      entityType: "booking",
      entityId: booking.id,
      actorType: "system",
      correlationId: inquiryId || null,
      payload: { proposalId, bookingReference: booking.booking_reference },
      autonomyLevel: 1,
    });

    return { bookingId: booking.id, bookingReference: booking.booking_reference, registered: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { bookingId: null, bookingReference: null, registered: false, error: message };
  }
}

/**
 * Steps 6 — BOOKING PAID → FINANCE.
 * Called by the admin confirm-payment flow after a payment is recorded.
 * Ensures an invoice exists for the booking (deposit invoice on deposit_paid,
 * final invoice on paid/full confirmation) and pushes the operational journey
 * to the matching status. Idempotent by (booking_id, invoice_type).
 */
export async function registerFinanceFromBooking(
  bookingId: string,
  input: {
    paymentType: "deposit" | "balance" | "full";
    amount: number;
    currency?: string;
    paymentReference?: string | null;
    paymentMethod?: string | null;
    notes?: string | null;
  }
): Promise<RegisterFinanceResult> {
  const db = createAdminClient();
  try {
    const invoiceType = input.paymentType === "deposit" ? "deposit" : "final";

    // Idempotent: one deposit invoice and one final invoice per booking.
    const { data: existingInvoice } = await db
      .from("invoices")
      .select("id, invoice_number")
      .eq("booking_id", bookingId)
      .eq("invoice_type", invoiceType)
      .maybeSingle();

    if (existingInvoice) {
      return {
        invoiceId: existingInvoice.id,
        invoiceNumber: existingInvoice.invoice_number,
        registered: false,
        error: null,
      };
    }

    const currency = input.currency || "USD";
    const { data: booking } = await db
      .from("bookings")
      .select("client_name, booking_reference")
      .eq("id", bookingId)
      .maybeSingle();

    const amount = Number(input.amount) || 0;
    const { data: invoice, error: invoiceError } = await db
      .from("invoices")
      .insert({
        booking_id: bookingId,
        invoice_type: invoiceType,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: new Date().toISOString().split("T")[0],
        paid_at: new Date().toISOString(),
        line_items: [
          {
            description:
              (invoiceType === "deposit" ? "Deposit payment" : "Final payment") +
              (booking?.booking_reference ? ` — ${booking.booking_reference}` : ""),
            quantity: 1,
            unit_price: amount,
            total: amount,
            payment_reference: input.paymentReference || null,
            payment_method: input.paymentMethod || null,
          },
        ],
        subtotal: amount,
        tax_amount: 0,
        tax_rate: 0,
        discount_amount: 0,
        total_amount: amount,
        currency,
        status: "paid",
        notes: input.notes || null,
      })
      .select("id, invoice_number")
      .single();

    if (invoiceError || !invoice) {
      return { invoiceId: null, invoiceNumber: null, registered: false, error: invoiceError?.message || "Invoice insert failed" };
    }

    // Push the operational journey to the matching state.
    const { data: bookingRow } = await db
      .from("bookings")
      .select("journey_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingRow?.journey_id) {
      // Deposit keeps the journey in proposal_sent; a balance or full payment
      // confirms it.
      const journeyStatus = input.paymentType === "deposit" ? "proposal_sent" : "confirmed";
      await db.from("journeys").update({ status: journeyStatus }).eq("id", bookingRow.journey_id);
    }

    await recordEvent({
      eventType: "PAYMENT_RECEIVED",
      entityType: "invoice",
      entityId: invoice.id,
      actorType: "system",
      correlationId: null,
      payload: { bookingId, invoiceNumber: invoice.invoice_number, paymentType: input.paymentType, amount },
      autonomyLevel: 2,
    });

    return { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, registered: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { invoiceId: null, invoiceNumber: null, registered: false, error: message };
  }
}

export interface RegisterSupplierMatchResult {
  journeyId: string | null;
  matchedCount: number;
  registered: boolean;
  error: string | null;
}

/**
 * Step 2b — ITINERARY → SUPPLIERS (SUPPLIERS_MATCHED).
 * Backfills `supplier_id` / `service_id` / `cost` on itinerary items that do
 * not yet have a supplier, matching each item's destination/location against
 * the active supplier_services catalog (idempotent: already-linked items are
 * left untouched). Best-effort — zero matches (no catalog entry for a
 * destination) is a valid outcome, not an error. Never throws.
 */
export async function registerSupplierMatchesForJourney(
  journeyId: string,
  options?: { correlationId?: string | null }
): Promise<RegisterSupplierMatchResult> {
  const db = createAdminClient();
  try {
    const { data: items, error: itemsError } = await db
      .from("itinerary_items")
      .select("id, destination, location, cost, supplier_id, service_id")
      .eq("journey_id", journeyId);

    if (itemsError || !items) {
      return { journeyId, matchedCount: 0, registered: false, error: itemsError?.message || "Itinerary items not found" };
    }

    const unmatched = (items as Record<string, unknown>[]).filter(
      (item) => !item.supplier_id && !item.service_id
    );
    if (unmatched.length === 0) {
      return { journeyId, matchedCount: 0, registered: true, error: null };
    }

    const { data: services, error: servicesError } = await db
      .from("supplier_services")
      .select("id, supplier_id, name, price, destination")
      .eq("is_active", true);

    if (servicesError || !services) {
      return { journeyId, matchedCount: 0, registered: true, error: null };
    }

    const byDestination = new Map<string, Record<string, unknown>[]>();
    for (const service of services as Record<string, unknown>[]) {
      const dest = String(service.destination || "").trim().toLowerCase();
      if (!dest) continue;
      const bucket = byDestination.get(dest) ?? [];
      bucket.push(service);
      byDestination.set(dest, bucket);
    }
    if (byDestination.size === 0) {
      return { journeyId, matchedCount: 0, registered: true, error: null };
    }

    let matchedCount = 0;
    for (const item of unmatched) {
      const key = String(item.destination || item.location || "").trim().toLowerCase();
      if (!key) continue;
      const candidates = byDestination.get(key);
      if (!candidates || candidates.length === 0) continue;
      const service = candidates[0];
      const { error: updateError } = await db
        .from("itinerary_items")
        .update({
          supplier_id: service.supplier_id as string,
          service_id: service.id as string,
          cost: Number(item.cost) || Number(service.price) || 0,
        })
        .eq("id", item.id as string);
      if (!updateError) matchedCount += 1;
    }

    await recordEvent({
      eventType: "SUPPLIERS_MATCHED",
      entityType: "journey",
      entityId: journeyId,
      actorType: "system",
      correlationId: options?.correlationId || null,
      payload: { journeyId, matchedCount },
      autonomyLevel: 1,
    });

    return { journeyId, matchedCount, registered: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { journeyId, matchedCount: 0, registered: false, error: message };
  }
}

export interface RegisterPricingResult {
  journeyId: string | null;
  proposalId: string | null;
  totalSupplierCost: number;
  grossProfit: number;
  grossMargin: number;
  registered: boolean;
  error: string | null;
}

/**
 * Step 2c — QUOTATION & MARGIN CHECKS (PRICE_CALCULATED).
 * Recomputes the operational journey's supplier cost, gross profit and gross
 * margin from its itinerary items (supplier cost sum vs the total selling
 * price) and mirrors the internal financials onto the linked proposal. Runs on
 * the same journey registration call that backfills suppliers, so the margin
 * reflects the matched supplier costs. Never throws.
 */
export async function registerJourneyPricing(
  journeyId: string,
  options?: { correlationId?: string | null }
): Promise<RegisterPricingResult> {
  const db = createAdminClient();
  try {
    const { data: journey, error: journeyError } = await db
      .from("journeys")
      .select("total_selling_price")
      .eq("id", journeyId)
      .single();
    if (journeyError || !journey) {
      return {
        journeyId,
        proposalId: null,
        totalSupplierCost: 0,
        grossProfit: 0,
        grossMargin: 0,
        registered: false,
        error: journeyError?.message || "Journey not found",
      };
    }

    const { data: items, error: itemsError } = await db
      .from("itinerary_items")
      .select("cost")
      .eq("journey_id", journeyId);
    if (itemsError) {
      return {
        journeyId,
        proposalId: null,
        totalSupplierCost: 0,
        grossProfit: 0,
        grossMargin: 0,
        registered: false,
        error: itemsError.message,
      };
    }

    const totalSupplierCost = (items as Record<string, unknown>[]).reduce(
      (sum, item) => sum + (Number(item.cost) || 0),
      0
    );
    const totalSellingPrice = Number(journey.total_selling_price) || 0;
    const grossProfit = Math.round((totalSellingPrice - totalSupplierCost) * 100) / 100;
    const grossMargin =
      totalSellingPrice > 0 ? Math.round((grossProfit / totalSellingPrice) * 10000) / 100 : 0;

    // Idempotent: recomputation overwrites the same numbers.
    await db
      .from("journeys")
      .update({
        total_supplier_cost: totalSupplierCost,
        gross_profit: grossProfit,
        gross_margin: grossMargin,
      })
      .eq("id", journeyId);

    const { data: proposal } = await db
      .from("proposals")
      .select("id")
      .eq("journey_id", journeyId)
      .maybeSingle();
    let proposalId: string | null = null;
    if (proposal) {
      proposalId = proposal.id as string;
      await db
        .from("proposals")
        .update({
          supplier_cost: totalSupplierCost,
          gross_profit: grossProfit,
          gross_margin: grossMargin,
        })
        .eq("id", proposal.id);
    }

    await recordEvent({
      eventType: "PRICE_CALCULATED",
      entityType: "journey",
      entityId: journeyId,
      actorType: "system",
      correlationId: options?.correlationId || null,
      payload: { journeyId, totalSupplierCost, totalSellingPrice, grossProfit, grossMargin },
      autonomyLevel: 1,
    });

    return {
      journeyId,
      proposalId,
      totalSupplierCost,
      grossProfit,
      grossMargin,
      registered: true,
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      journeyId,
      proposalId: null,
      totalSupplierCost: 0,
      grossProfit: 0,
      grossMargin: 0,
      registered: false,
      error: message,
    };
  }
}

export interface RegisterReviewResult {
  proposalId: string | null;
  reviewRequested: boolean;
  adminApproved: boolean;
  registered: boolean;
  error: string | null;
}

/**
 * Step 3.5 — HUMAN APPROVAL (HUMAN_REVIEW_REQUESTED / ADMIN_APPROVED).
 * Emitted from proposal status transitions: `ready` asks a human to review the
 * drafted offer (recommendation, autonomy 1), `sent` records that a human
 * cleared the offer and it was dispatched (human authorization, autonomy 4).
 * The correlation chain is threaded back through proposal → journey → lead →
 * inquiry so the approval lands on the same flow as the finished offer.
 * Never throws.
 */
export async function registerProposalReviewStage(
  proposalId: string,
  status: "ready" | "sent",
  options?: { actorId?: string | null }
): Promise<RegisterReviewResult> {
  const db = createAdminClient();
  try {
    let correlationId: string | null = null;
    const { data: proposal } = await db
      .from("proposals")
      .select("journey_id")
      .eq("id", proposalId)
      .maybeSingle();
    if (proposal?.journey_id) {
      const { data: journey } = await db
        .from("journeys")
        .select("lead_id")
        .eq("id", proposal.journey_id as string)
        .maybeSingle();
      if (journey?.lead_id) {
        const { data: lead } = await db
          .from("leads")
          .select("inquiry_id")
          .eq("id", journey.lead_id as string)
          .maybeSingle();
        correlationId = (lead?.inquiry_id as string | null) ?? null;
      }
    }

    if (status === "ready") {
      await recordEvent({
        eventType: "HUMAN_REVIEW_REQUESTED",
        entityType: "proposal",
        entityId: proposalId,
        actorType: "system",
        correlationId,
        payload: { proposalId, status: "ready" },
        autonomyLevel: 1,
      });
      return { proposalId, reviewRequested: true, adminApproved: false, registered: true, error: null };
    }

    await recordEvent({
      eventType: "ADMIN_APPROVED",
      entityType: "proposal",
      entityId: proposalId,
      actorType: "human",
      actorId: options?.actorId ?? null,
      correlationId,
      payload: { proposalId, status: "sent" },
      autonomyLevel: 4,
      humanReviewed: true,
    });
    return { proposalId, reviewRequested: false, adminApproved: true, registered: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { proposalId, reviewRequested: false, adminApproved: false, registered: false, error: message };
  }
}

export interface RegisterSupplierReservationResult {
  bookingId: string | null;
  requestedCount: number;
  confirmedCount: number;
  registered: boolean;
  error: string | null;
}

/**
 * Steps 4.5+5.5 — OPERATIONS & SUPPLIER CONFIRMATIONS
 * (SUPPLIER_REQUESTED / SUPPLIER_CONFIRMED).
 * On a booking transition to `confirmed`, derives booking_suppliers rows from
 * the journey's supplier-linked itinerary items (idempotent by booking +
 * supplier + service). On `in_progress` / `completed`, marks those rows
 * `confirmed` so operations sees which suppliers are locked in. The two
 * events are emitted from the same hook as the status change so the audit
 * trail shows the operations stage advancing. Never throws.
 */
export async function registerSupplierReservationsForBooking(
  bookingId: string,
  status: string
): Promise<RegisterSupplierReservationResult> {
  const db = createAdminClient();
  try {
    const { data: booking } = await db
      .from("bookings")
      .select("journey_id, inquiry_id")
      .eq("id", bookingId)
      .maybeSingle();
    const journeyId = (booking?.journey_id as string | null) ?? null;
    if (!journeyId) {
      return { bookingId, requestedCount: 0, confirmedCount: 0, registered: true, error: null };
    }
    const correlationId = (booking?.inquiry_id as string | null) ?? null;

    if (status === "confirmed") {
      const { data: items, error: itemsError } = await db
        .from("itinerary_items")
        .select("id, supplier_id, service_id, title, cost, currency, date")
        .eq("journey_id", journeyId)
        .not("supplier_id", "is", null);

      if (itemsError) {
        return { bookingId, requestedCount: 0, confirmedCount: 0, registered: false, error: itemsError.message };
      }

      const linked: Record<string, unknown>[] = (items as Record<string, unknown>[])
        .filter((item) => item.supplier_id)
        .map((item) => ({
          booking_id: bookingId,
          supplier_id: item.supplier_id as string,
          service_id: (item.service_id as string | null) ?? null,
          service_name: String(item.title || "") || null,
          cost: Number(item.cost) || 0,
          currency: String(item.currency || "USD"),
          start_date: item.date ? String(item.date) : null,
          supplier_status: "pending",
        }));

      // Idempotent: skip booking-supplier pairs this booking already carries.
      const { data: existing } = await db
        .from("booking_suppliers")
        .select("supplier_id, service_id")
        .eq("booking_id", bookingId);
      const existingPairs =
        (existing as Record<string, unknown>[] | null)?.map((row) => ({
          supplier: row.supplier_id as string,
          service: (row.service_id as string | null) ?? null,
        })) ?? [];

      const fresh = linked.filter(
        (row) =>
          !existingPairs.some(
            (pair) => pair.supplier === row.supplier_id && pair.service === (row.service_id ?? null)
          )
      );

      if (fresh.length > 0) {
        const { error: insertError } = await db.from("booking_suppliers").insert(fresh);
        if (insertError) {
          return { bookingId, requestedCount: 0, confirmedCount: 0, registered: false, error: insertError.message };
        }
      }

      await recordEvent({
        eventType: "SUPPLIER_REQUESTED",
        entityType: "booking",
        entityId: bookingId,
        actorType: "system",
        correlationId,
        payload: { bookingId, requestedCount: fresh.length },
        autonomyLevel: 2,
      });

      return { bookingId, requestedCount: fresh.length, confirmedCount: 0, registered: true, error: null };
    }

    if (status === "in_progress" || status === "completed") {
      const { data: suppliers, error: suppliersError } = await db
        .from("booking_suppliers")
        .select("id")
        .eq("booking_id", bookingId);
      if (suppliersError) {
        return { bookingId, requestedCount: 0, confirmedCount: 0, registered: false, error: suppliersError.message };
      }
      const supplierIds = (suppliers as Record<string, unknown>[] | null) ?? [];
      if (supplierIds.length > 0) {
        await db
          .from("booking_suppliers")
          .update({ supplier_status: "confirmed" })
          .eq("booking_id", bookingId);
      }

      await recordEvent({
        eventType: "SUPPLIER_CONFIRMED",
        entityType: "booking",
        entityId: bookingId,
        actorType: "system",
        correlationId,
        payload: { bookingId, confirmedCount: supplierIds.length },
        autonomyLevel: 2,
      });

      return { bookingId, requestedCount: 0, confirmedCount: supplierIds.length, registered: true, error: null };
    }

    return { bookingId, requestedCount: 0, confirmedCount: 0, registered: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { bookingId, requestedCount: 0, confirmedCount: 0, registered: false, error: message };
  }
}

export interface RegisterTripDeliveryResult {
  journeyId: string | null;
  registered: boolean;
  error: string | null;
}

/**
 * Steps 5.6+6 — TRIP DELIVERY & LEARNING (JOURNEY_COMPLETED / JOURNEY_LEARNED).
 * Advances the operational journey alongside the booking: `in_progress` puts
 * the journey in_operation, `completed` marks it completed and emits both the
 * completion event and the learning event that feeds the flywheel. Idempotent
 * by design (journey status update is a repeated write of the same value).
 * Never throws.
 */
export async function registerTripDelivery(
  bookingId: string,
  status: string
): Promise<RegisterTripDeliveryResult> {
  const db = createAdminClient();
  try {
    const { data: booking } = await db
      .from("bookings")
      .select("journey_id, inquiry_id")
      .eq("id", bookingId)
      .maybeSingle();
    const journeyId = (booking?.journey_id as string | null) ?? null;
    if (!journeyId) {
      return { journeyId: null, registered: true, error: null };
    }
    const correlationId = (booking?.inquiry_id as string | null) ?? null;

    if (status === "in_progress") {
      await db.from("journeys").update({ status: "in_operation" }).eq("id", journeyId);
      return { journeyId, registered: true, error: null };
    }

    if (status === "completed") {
      await db.from("journeys").update({ status: "completed" }).eq("id", journeyId);
      await recordEvent({
        eventType: "JOURNEY_COMPLETED",
        entityType: "journey",
        entityId: journeyId,
        actorType: "system",
        correlationId,
        payload: { bookingId },
        autonomyLevel: 2,
      });
      await recordEvent({
        eventType: "JOURNEY_LEARNED",
        entityType: "journey",
        entityId: journeyId,
        actorType: "system",
        correlationId,
        payload: { bookingId, source: "trip-completion" },
        autonomyLevel: 3,
      });
      return { journeyId, registered: true, error: null };
    }

    return { journeyId, registered: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { journeyId: null, registered: false, error: message };
  }
}

export interface RegisterFeedbackResult {
  bookingId: string | null;
  registered: boolean;
  error: string | null;
}

/**
 * Step 6.5 — TRIP DELIVERY & FOLLOW-UP (CLIENT_FEEDBACK_RECEIVED).
 * Records a completed trip's feedback on the event bus (the append-only stream
 * is the institutional memory; the rating and comment live in the payload so
 * the flow stays reconstructionable without a separate feedback table). Always
 * non-fatal — a lost feedback write must not fail the guest's submission.
 */
export async function registerGuestFeedback(
  bookingId: string,
  input: { rating: number; comment?: string | null }
): Promise<RegisterFeedbackResult> {
  const db = createAdminClient();
  try {
    const { data: booking } = await db
      .from("bookings")
      .select("journey_id, inquiry_id")
      .eq("id", bookingId)
      .maybeSingle();

    const correlationId = (booking?.inquiry_id as string | null) ?? null;

    await recordEvent({
      eventType: "CLIENT_FEEDBACK_RECEIVED",
      entityType: "booking",
      entityId: bookingId,
      actorType: "system",
      correlationId,
      payload: {
        bookingId,
        journeyId: (booking?.journey_id as string | null) ?? null,
        rating: input.rating,
        comment: input.comment || null,
      },
      autonomyLevel: 0,
    });

    return { bookingId, registered: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { bookingId, registered: false, error: message };
  }
}

/**
 * Resolve the originating inquiry for an operational journey, following the
 * chain journey → lead → inquiry that the pipeline establishes on creation.
 * Used by every later step (concierge requests, task follow-ups) so their
 * events land on the same correlation thread as the guest journey. Null means
 * the journey is not yet linked into the chain (still a valid outcome — the
 * event is recorded, it just starts its own flow). Never throws.
 */
async function resolveCorrelationFromJourney(journeyId: string): Promise<string | null> {
  const db = createAdminClient();
  try {
    const { data: journey } = await db
      .from("journeys")
      .select("lead_id")
      .eq("id", journeyId)
      .maybeSingle();
    if (!journey || typeof journey !== "object") return null;
    const leadId = (journey as Record<string, unknown>).lead_id;
    if (typeof leadId !== "string") return null;

    const { data: lead } = await db
      .from("leads")
      .select("inquiry_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead || typeof lead !== "object") return null;
    const inquiryId = (lead as Record<string, unknown>).inquiry_id;
    return typeof inquiryId === "string" ? inquiryId : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the originating inquiry from a task's polymorphic
 * related_type/related_id pair (the "this task belongs to a booking / journey
 * / lead / proposal / guest" link), so follow-up events land on the same flow
 * as the work they track. Null is a valid outcome (task linked to nothing, or
 * a link not yet in the chain) — the event is still recorded. Never throws.
 */
async function resolveCorrelationFromRelated(
  relatedType: string | null,
  relatedId: string | null
): Promise<string | null> {
  if (!relatedType || !relatedId) return null;
  const db = createAdminClient();
  const type = relatedType.trim().toLowerCase().replace(/s$/, "");
  try {
    if (type === "inquiry") return relatedId;

    if (type === "booking") {
      const { data: booking } = await db
        .from("bookings")
        .select("inquiry_id")
        .eq("id", relatedId)
        .maybeSingle();
      if (!booking || typeof booking !== "object") return null;
      const inquiryId = (booking as Record<string, unknown>).inquiry_id;
      return typeof inquiryId === "string" ? inquiryId : null;
    }

    if (type === "journey") return resolveCorrelationFromJourney(relatedId);

    if (type === "lead") {
      const { data: lead } = await db
        .from("leads")
        .select("inquiry_id")
        .eq("id", relatedId)
        .maybeSingle();
      if (!lead || typeof lead !== "object") return null;
      const inquiryId = (lead as Record<string, unknown>).inquiry_id;
      return typeof inquiryId === "string" ? inquiryId : null;
    }

    if (type === "proposal") {
      const { data: proposal } = await db
        .from("proposals")
        .select("journey_id")
        .eq("id", relatedId)
        .maybeSingle();
      if (!proposal || typeof proposal !== "object") return null;
      const journeyId = (proposal as Record<string, unknown>).journey_id;
      return typeof journeyId === "string" ? resolveCorrelationFromJourney(journeyId) : null;
    }

    if (type === "guest_profile" || type === "guest") {
      const { data: lead } = await db
        .from("leads")
        .select("inquiry_id")
        .eq("guest_profile_id", relatedId)
        .maybeSingle();
      if (!lead || typeof lead !== "object") return null;
      const inquiryId = (lead as Record<string, unknown>).inquiry_id;
      return typeof inquiryId === "string" ? inquiryId : null;
    }

    return null;
  } catch {
    return null;
  }
}

export interface RegisterConciergeResult {
  conciergeRequestId: string | null;
  registered: boolean;
  error: string | null;
}

/**
 * Step 7 — GUEST SERVICE (CONCIERGE_REQUESTED).
 * Emitted when a concierge request is raised for a guest (airport VIP,
 * flowers, a private dinner…). A guest-facing need is part of the journey
 * flow, so the event threads back to the originating inquiry through the
 * request's booking / journey / lead / customer links. Idempotent by design
 * (the request id is the entity id, so re-runs of the same id produce the
 * same event shape). Never throws.
 */
export async function registerConciergeRequest(
  conciergeRequestId: string,
  options?: { actorId?: string | null }
): Promise<RegisterConciergeResult> {
  const db = createAdminClient();
  try {
    const { data: request, error: requestError } = await db
      .from("concierge_requests")
      .select("id, customer_id, journey_id, booking_id, lead_id, category, priority, request, created_by")
      .eq("id", conciergeRequestId)
      .single();

    if (requestError || !request || typeof request !== "object") {
      return {
        conciergeRequestId: null,
        registered: false,
        error: requestError?.message || "Concierge request not found",
      };
    }
    const row = request as Record<string, unknown>;

    let correlationId: string | null = null;
    if (typeof row.booking_id === "string") {
      const { data: booking } = await db
        .from("bookings")
        .select("inquiry_id")
        .eq("id", row.booking_id as string)
        .maybeSingle();
      if (booking && typeof booking === "object") {
        const inquiryId = (booking as Record<string, unknown>).inquiry_id;
        correlationId = typeof inquiryId === "string" ? inquiryId : null;
      }
    }
    if (!correlationId && typeof row.journey_id === "string") {
      correlationId = await resolveCorrelationFromJourney(row.journey_id as string);
    }
    if (!correlationId && typeof row.lead_id === "string") {
      const { data: lead } = await db
        .from("leads")
        .select("inquiry_id")
        .eq("id", row.lead_id as string)
        .maybeSingle();
      if (lead && typeof lead === "object") {
        const inquiryId = (lead as Record<string, unknown>).inquiry_id;
        correlationId = typeof inquiryId === "string" ? inquiryId : null;
      }
    }
    if (!correlationId && typeof row.customer_id === "string") {
      const { data: lead } = await db
        .from("leads")
        .select("inquiry_id")
        .eq("guest_profile_id", row.customer_id as string)
        .maybeSingle();
      if (lead && typeof lead === "object") {
        const inquiryId = (lead as Record<string, unknown>).inquiry_id;
        correlationId = typeof inquiryId === "string" ? inquiryId : null;
      }
    }

    await recordEvent({
      eventType: "CONCIERGE_REQUESTED",
      entityType: "concierge_request",
      entityId: conciergeRequestId,
      actorType: "human",
      actorId: options?.actorId ?? (typeof row.created_by === "string" ? (row.created_by as string) : null),
      correlationId,
      payload: {
        conciergeRequestId,
        category: row.category ?? null,
        priority: row.priority ?? "medium",
      },
      autonomyLevel: 0,
      humanReviewed: true,
    });

    return { conciergeRequestId, registered: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { conciergeRequestId: null, registered: false, error: message };
  }
}

export interface RegisterTaskResult {
  taskId: string | null;
  registered: boolean;
  error: string | null;
}

/**
 * TASK LIFECYCLE (TASK_CREATED / TASK_COMPLETED).
 * Operational events for the ops team's task list: creation (a follow-up was
 * opened) and completion (a follow-up was closed). Threads back to the flow
 * the task tracks through its related_type/related_id link so Mission Control
 * sees the task on the same correlation as the guest journey it belongs to.
 * Never throws.
 */
export async function registerTaskStage(
  taskId: string,
  stage: "created" | "completed",
  options?: { actorId?: string | null }
): Promise<RegisterTaskResult> {
  const db = createAdminClient();
  try {
    const { data: task, error: taskError } = await db
      .from("tasks")
      .select("id, title, related_type, related_id, status, created_by")
      .eq("id", taskId)
      .single();

    if (taskError || !task || typeof task !== "object") {
      return { taskId: null, registered: false, error: taskError?.message || "Task not found" };
    }
    const row = task as Record<string, unknown>;

    const correlationId = await resolveCorrelationFromRelated(
      typeof row.related_type === "string" ? (row.related_type as string) : null,
      typeof row.related_id === "string" ? (row.related_id as string) : null
    );

    await recordEvent({
      eventType: stage === "created" ? "TASK_CREATED" : "TASK_COMPLETED",
      entityType: "task",
      entityId: taskId,
      actorType: "human",
      actorId: options?.actorId ?? (typeof row.created_by === "string" ? (row.created_by as string) : null),
      correlationId,
      payload: {
        taskId,
        title: typeof row.title === "string" ? row.title.slice(0, 200) : null,
        relatedType: row.related_type ?? null,
        relatedId: row.related_id ?? null,
        status: row.status ?? null,
      },
      autonomyLevel: 0,
      humanReviewed: stage === "completed",
    });

    return { taskId, registered: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { taskId: null, registered: false, error: message };
  }
}