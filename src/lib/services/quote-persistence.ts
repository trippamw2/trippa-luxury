// ─── Quote Persistence Service ─────────────────────────────────────────
// Persists sent quotes to the database: upserts guest profile, inserts
// saved_journey, creates provisional booking, and links them together.

import { createAdminClient } from "@/lib/supabase/admin";
import { logInteraction } from "@/lib/ai/customer-intelligence";
import type { GuestProfile } from "@/lib/ai/types";
import type { QuoteData } from "@/lib/ai/quote-engine";

export interface PersistQuoteResult {
  guestProfileId: string;
  journeyId: string;
  bookingId: string;
  bookingReference: string;
}

export async function persistQuote(
  profile: GuestProfile,
  quote: QuoteData,
  inquiryId?: string
): Promise<PersistQuoteResult> {
  const db = createAdminClient();

  // ── 1. Upsert guest profile (match by email) ────────────────────────
  const { data: existingGuest } = await db
    .from("guest_profiles")
    .select("id")
    .eq("email", profile.email)
    .single();

  let guestProfileId: string;

  if (existingGuest) {
    // Update existing profile
    const { error: updateError } = await db
      .from("guest_profiles")
      .update({
        full_name: profile.name,
        is_couple: profile.isCouple,
        travel_style: profile.preferences.travelStyle,
        accommodation_style: profile.preferences.accommodationStyle,
        activity_level: profile.preferences.activityLevel,
        budget_range: profile.preferences.budgetRange,
        dietary_restrictions: profile.preferences.dietaryRestrictions
          ? JSON.parse(JSON.stringify(profile.preferences.dietaryRestrictions))
          : [],
        interests: profile.preferences.interests
          ? JSON.parse(JSON.stringify(profile.preferences.interests))
          : [],
        special_occasion: profile.specialOccasion || null,
        past_destinations: profile.pastDestinations
          ? JSON.parse(JSON.stringify(profile.pastDestinations))
          : [],
        wishlist: profile.wishlist
          ? JSON.parse(JSON.stringify(profile.wishlist))
          : [],
        last_contacted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingGuest.id);

    if (updateError) throw new Error(`Failed to update guest profile: ${updateError.message}`);
    guestProfileId = existingGuest.id;
  } else {
    // Insert new profile
    const { data: newGuest, error: insertError } = await db
      .from("guest_profiles")
      .insert({
        full_name: profile.name,
        email: profile.email,
        is_couple: profile.isCouple,
        travel_style: profile.preferences.travelStyle,
        accommodation_style: profile.preferences.accommodationStyle,
        activity_level: profile.preferences.activityLevel,
        budget_range: profile.preferences.budgetRange,
        dietary_restrictions: profile.preferences.dietaryRestrictions
          ? JSON.parse(JSON.stringify(profile.preferences.dietaryRestrictions))
          : [],
        interests: profile.preferences.interests
          ? JSON.parse(JSON.stringify(profile.preferences.interests))
          : [],
        special_occasion: profile.specialOccasion || null,
        past_destinations: profile.pastDestinations
          ? JSON.parse(JSON.stringify(profile.pastDestinations))
          : [],
        wishlist: profile.wishlist
          ? JSON.parse(JSON.stringify(profile.wishlist))
          : [],
        source: "website",
        email_opt_in: true,
      })
      .select("id")
      .single();

    if (insertError || !newGuest) {
      throw new Error(`Failed to create guest profile: ${insertError?.message || "Unknown error"}`);
    }
    guestProfileId = newGuest.id;

    // Increment total_bookings for returning guests will be handled on booking creation
  }

  // ── 2. Create provisional booking ───────────────────────────────────
  const travelStart = profile.travelDates?.start || null;
  const travelEnd = profile.travelDates?.end || null;
  const dietaryReqs = profile.preferences.dietaryRestrictions?.join(", ") || null;

  const { data: booking, error: bookingError } = await db
    .from("bookings")
    .insert({
      status: "provisional",
      inquiry_id: inquiryId || null,
      client_name: profile.name,
      client_email: profile.email,
      guests_count: profile.isCouple ? 2 : 1,
      destination: quote.journey.destinations[0] || null,
      start_date: travelStart,
      end_date: travelEnd,
      duration_nights: quote.journey.duration,
      total_amount: quote.journey.pricing.total,
      currency: quote.journey.pricing.currency || "USD",
      deposit_amount: quote.depositRequired,
      deposit_due_date: quote.validUntil,
      special_requests: null,
      dietary_requirements: dietaryReqs,
    })
    .select("id, booking_reference")
    .single();

  if (bookingError || !booking) {
    throw new Error(`Failed to create booking: ${bookingError?.message || "Unknown error"}`);
  }

  // ── 3. Insert saved journey (tied to guest + booking) ──────────────
  const { data: journey, error: journeyError } = await db
    .from("saved_journeys")
    .insert({
      title: quote.journey.title,
      subtitle: quote.journey.subtitle,
      quote_ref: quote.quoteRef,
      guest_profile_id: guestProfileId,
      guest_name: profile.name,
      guest_email: profile.email,
      is_couple: profile.isCouple,
      special_occasion: profile.specialOccasion || null,
      destinations: JSON.parse(JSON.stringify(quote.journey.destinations)),
      duration: quote.journey.duration,
      itinerary: JSON.parse(JSON.stringify(quote.journey.itinerary)),
      pricing: JSON.parse(JSON.stringify(quote.journey.pricing)),
      highlights: JSON.parse(JSON.stringify(quote.journey.highlights)),
      included_extras: JSON.parse(JSON.stringify(quote.journey.includedExtras)),
      preferences: JSON.parse(JSON.stringify(profile.preferences)),
      status: "sent",
      inquiry_id: inquiryId || null,
      booking_id: booking.id,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (journeyError || !journey) {
    throw new Error(`Failed to save journey: ${journeyError?.message || "Unknown error"}`);
  }

  // ── 4. Update guest profile booking stats ──────────────────────────
  const { data: currentGuest } = await db
    .from("guest_profiles")
    .select("total_bookings, total_spent")
    .eq("id", guestProfileId)
    .single();

  if (currentGuest) {
    await db
      .from("guest_profiles")
      .update({
        total_bookings: (currentGuest.total_bookings || 0) + 1,
        total_spent: (currentGuest.total_spent || 0) + Number(quote.journey.pricing.total),
        last_contacted_at: new Date().toISOString(),
      })
      .eq("id", guestProfileId);
  }

  // ── 5. Log the outbound quote as a customer interaction ─────────────
  // This keeps the CRM timeline complete without extra calls in the route.
  await logInteraction({
    guestProfileId,
    channel: "email",
    direction: "outbound",
    subject: `Journey proposal ${quote.quoteRef} sent`,
    body: `Quote ${quote.quoteRef} — ${quote.journey.title} (${quote.journey.duration} nights). Total $${quote.journey.pricing.total.toLocaleString()}. Deposit $${quote.depositRequired.toLocaleString()}.`,
    relatedBookingId: booking.id,
    relatedInquiryId: inquiryId,
  });

  return {
    guestProfileId,
    journeyId: journey.id,
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
  };
}
