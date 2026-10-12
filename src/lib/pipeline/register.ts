// ─── Kivara Pipeline Registration Service ──────────────────────────────
// Closes the automation chain between back-office modules. Each function is
// IDEMPOTENT: registering the same enquiry / journey / proposal twice never
// produces a duplicate lead, journey, proposal, booking or invoice.
//
//   enquiries → leads            registerLeadFromInquiry
//   journeys → proposals         registerJourneyFromSavedJourney
//   journeys → itinerary_items   registerJourneyFromSavedJourney
//   proposals → bookings         registerBookingFromProposal
//   bookings  → finance          registerFinanceFromBooking
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