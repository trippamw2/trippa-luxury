// ─── Kivara Customer Intelligence Service ────────────────────────────────
// Aggregates all customer data across the platform into a unified intelligence
// profile. This is the "single source of truth" layer that every AI agent
// queries when it needs to understand a customer.
//
// Sections:
//   1. Types
//   2. Scoring (engagement, LTV, churn risk)
//   3. Intelligence aggregation
//   4. Timeline construction
//   5. Segment classification
//   6. Bulk intelligence (dashboard)
//   7. Interaction logging

import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel } from "@/lib/api-helpers";

// ─── 1. Types ─────────────────────────────────────────────────────────────

export interface CustomerInteraction {
  id: string;
  channel: "email" | "call" | "whatsapp" | "sms" | "meeting" | "note" | "inquiry" | "booking" | "payment" | "journey";
  direction: "inbound" | "outbound";
  subject?: string;
  body?: string;
  relatedBookingId?: string;
  relatedInquiryId?: string;
  relatedJourneyId?: string;
  adminId?: string;
  createdAt: string;
}

export interface CustomerBooking {
  id: string;
  bookingReference: string;
  status: string;
  destinations: string[];
  totalAmount: number;
  depositPaid: number;
  balanceDue: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface CustomerJourney {
  id: string;
  title: string;
  quoteRef?: string;
  status: string;
  destinations: string[];
  duration: number;
  totalPrice: number;
  createdAt: string;
  sentAt?: string;
  acceptedAt?: string;
}

export interface CustomerInquiry {
  id: string;
  status: string;
  message: string;
  destinations: string[];
  createdAt: string;
  firstResponseAt?: string;
  convertedToBookingId?: string;
}

export interface CustomerIntelligence {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  country?: string;

  isCouple: boolean;
  specialOccasion?: string;
  specialOccasionDate?: string;
  anniversaryDate?: string;
  preferences: {
    travelStyle: string;
    accommodationStyle: string;
    activityLevel: string;
    budgetRange: string;
    dietaryRestrictions: string[];
    interests: string[];
  };

  source: string;
  referralSource?: string;
  tags: string[];
  isVip: boolean;
  notes?: string;

  intelligence: {
    engagementScore: number;
    relationshipDepth: number;
    leadScore: number;
    leadTier: "hot" | "warm" | "cold";
    ltvPrediction: number;
    churnRisk: number;
    nextAction: string;
    daysSinceLastContact: number;
    daysUntilOccasion: number | null;
  };

  stats: {
    totalInquiries: number;
    totalBookings: number;
    totalJourneys: number;
    totalSpent: number;
    averageBookingValue: number;
    conversionRate: number;
    lastTripDate?: string;
    lastContactedAt?: string;
  };

  recentInteractions: CustomerInteraction[];
  recentBookings: CustomerBooking[];
  recentJourneys: CustomerJourney[];
  recentInquiries: CustomerInquiry[];

  segment: {
    primary: "honeymoon" | "anniversary" | "proposal" | "safari" | "beach" | "cultural" | "celebration" | "repeat" | "new";
    value: "vip" | "high" | "medium" | "low";
    lifecycle: "prospect" | "inquiry" | "quoted" | "booked" | "travelled" | "returned" | "dormant";
  };

  emailOptIn: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── 2. Scoring ───────────────────────────────────────────────────────────

/**
 * Compute engagement score from raw signals.
 * Weights: recency of contact, frequency of interactions, booking activity.
 */
export function computeEngagementScore(signals: {
  daysSinceLastContact: number;
  interactionCount30d: number;
  interactionCount90d: number;
  inquiryCount: number;
  bookingCount: number;
  journeyViewCount: number;
}): number {
  let score = 0;

  if (signals.daysSinceLastContact <= 1) score += 30;
  else if (signals.daysSinceLastContact <= 7) score += 25;
  else if (signals.daysSinceLastContact <= 30) score += 15;
  else if (signals.daysSinceLastContact <= 90) score += 5;

  score += Math.min(signals.interactionCount30d * 10, 30);
  score += Math.min(signals.interactionCount90d * 3, 20);
  score += Math.min(signals.bookingCount * 10, 20);

  return Math.min(score, 100);
}

/**
 * Compute relationship depth — how well do we know this customer?
 */
export function computeRelationshipDepth(data: {
  hasPhone: boolean;
  hasCountry: boolean;
  hasSpecialOccasion: boolean;
  hasAnniversaryDate: boolean;
  hasDietaryRestrictions: boolean;
  hasInterests: boolean;
  hasPastDestinations: boolean;
  hasWishlist: boolean;
  hasNotes: boolean;
  interactionCount: number;
  bookingCount: number;
}): number {
  let depth = 0;

  if (data.hasPhone) depth += 8;
  if (data.hasCountry) depth += 6;
  if (data.hasSpecialOccasion) depth += 8;
  if (data.hasAnniversaryDate) depth += 6;
  if (data.hasDietaryRestrictions) depth += 7;
  if (data.hasInterests) depth += 7;
  if (data.hasPastDestinations) depth += 5;
  if (data.hasWishlist) depth += 3;
  if (data.hasNotes) depth += 5;

  depth += Math.min(data.interactionCount * 3, 30);
  depth += Math.min(data.bookingCount * 10, 20);

  return Math.min(depth, 100);
}

/**
 * Predict customer lifetime value based on available signals.
 */
export function computeLtvPrediction(data: {
  totalSpent: number;
  bookingCount: number;
  averageBookingValue: number;
  leadScore: number;
  isVip: boolean;
  occasionType?: string;
}): number {
  let ltv = data.totalSpent;

  if (data.bookingCount > 1) {
    ltv *= 1 + (data.bookingCount - 1) * 0.3;
  }

  if (data.isVip) ltv *= 1.25;
  if (data.leadScore > 60) ltv *= 1.15;

  if (data.occasionType === "honeymoon" || data.occasionType === "anniversary") {
    ltv *= 1.1;
  }

  return Math.round(ltv);
}

/**
 * Compute churn risk based on recency and engagement signals.
 */
export function computeChurnRisk(signals: {
  daysSinceLastContact: number;
  daysSinceLastTrip: number | null;
  hasOpenInquiry: boolean;
  hasUpcomingBooking: boolean;
  engagementScore: number;
}): number {
  let risk = 0;

  if (signals.daysSinceLastContact > 365) risk += 0.4;
  else if (signals.daysSinceLastContact > 180) risk += 0.25;
  else if (signals.daysSinceLastContact > 90) risk += 0.1;

  if (signals.daysSinceLastTrip !== null) {
    if (signals.daysSinceLastTrip > 365) risk += 0.2;
    else if (signals.daysSinceLastTrip > 180) risk += 0.1;
  }

  if (!signals.hasOpenInquiry && !signals.hasUpcomingBooking) risk += 0.15;

  if (signals.engagementScore < 20) risk += 0.15;
  else if (signals.engagementScore < 40) risk += 0.05;

  return Math.min(risk, 1);
}

/**
 * Recommend next action based on customer state.
 */
export function recommendNextAction(data: {
  engagementScore: number;
  leadTier: string;
  churnRisk: number;
  hasOpenInquiry: boolean;
  daysSinceLastContact: number;
  daysUntilOccasion: number | null;
  hasUpcomingBooking: boolean;
  lifecycle: string;
}): string {
  if (data.leadTier === "hot" && data.engagementScore < 30) {
    return "Re-engagement: Hot lead with low recent activity. Send personalised check-in.";
  }

  if (data.daysUntilOccasion !== null && data.daysUntilOccasion <= 30 && data.daysUntilOccasion > 0) {
    return `Occasion reminder: ${data.daysUntilOccasion} days until occasion. Send celebration offer.`;
  }

  if (data.hasOpenInquiry && data.daysSinceLastContact > 3) {
    return "Follow-up: Open inquiry without recent contact. Send proposal or check-in.";
  }

  if (data.churnRisk > 0.5 && data.lifecycle === "travelled") {
    return "Win-back: High churn risk on a past traveller. Send exclusive return offer.";
  }

  if (data.lifecycle === "inquiry" && data.daysSinceLastContact > 30) {
    return "Nurture: Dormant inquiry. Send destination inspiration or new journey concept.";
  }

  if (data.engagementScore > 60 && !data.hasUpcomingBooking) {
    return "Upsell: Highly engaged customer without upcoming booking. Present new journey concept.";
  }

  return "Monitor: Customer is in a healthy state. No immediate action required.";
}

// ─── 3. Intelligence Aggregation ───────────────────────────────────────────

/**
 * Build a full CustomerIntelligence record from a guest profile ID.
 * This is the core function that any AI agent calls to understand a customer.
 */
export async function getCustomerIntelligence(guestProfileId: string): Promise<CustomerIntelligence | null> {
  const supabase = createAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("guest_profiles")
    .select("*")
    .eq("id", guestProfileId)
    .single();

  if (profileError || !profile) return null;

  const [
    communicationsResult,
    bookingsResult,
    journeysResult,
    inquiriesResult,
  ] = await Promise.all([
    supabase
      .from("guest_communications")
      .select("*")
      .eq("guest_profile_id", guestProfileId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("bookings")
      .select("*")
      .eq("guest_profile_id", guestProfileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_journeys")
      .select("*")
      .eq("guest_profile_id", guestProfileId)
      .order("created_at", { ascending: false }),
    supabase
      .from("inquiries")
      .select("*")
      .eq("guest_profile_id", guestProfileId)
      .order("created_at", { ascending: false }),
  ]);

  const communications = mapKeysToCamel<CustomerInteraction[]>(communicationsResult.data || []);
  const bookings = mapKeysToCamel<CustomerBooking[]>(bookingsResult.data || []);
  const journeys = mapKeysToCamel<CustomerJourney[]>(journeysResult.data || []);
  const inquiries = mapKeysToCamel<CustomerInquiry[]>(inquiriesResult.data || []);

  const now = new Date();
  const lastContactedAt = profile.last_contacted_at ? new Date(profile.last_contacted_at) : null;
  const daysSinceLastContact = lastContactedAt
    ? Math.floor((now.getTime() - lastContactedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const lastTripDate = profile.last_trip_date ? new Date(profile.last_trip_date) : null;
  const daysSinceLastTrip = lastTripDate
    ? Math.floor((now.getTime() - lastTripDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let daysUntilOccasion: number | null = null;
  const occasionDateRaw: string | null = profile.anniversary_date || profile.special_occasion_date || null;
  if (occasionDateRaw) {
    const occasion = new Date(occasionDateRaw);
    const thisYear = now.getFullYear();
    occasion.setFullYear(thisYear);
    if (occasion < now) occasion.setFullYear(thisYear + 1);
    daysUntilOccasion = Math.floor((occasion.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const interactionCount30d = communications.filter(c => new Date(c.createdAt) > thirtyDaysAgo).length;
  const interactionCount90d = communications.filter(c => new Date(c.createdAt) > ninetyDaysAgo).length;

  const hasOpenInquiry = inquiries.some(i => !["booked", "closed"].includes(i.status));
  const hasUpcomingBooking = bookings.some(b => {
    const start = b.startDate ? new Date(b.startDate) : null;
    return start && start > now && ["confirmed", "deposit_paid"].includes(b.status);
  });

  const engagementScore = computeEngagementScore({
    daysSinceLastContact,
    interactionCount30d,
    interactionCount90d,
    inquiryCount: inquiries.length,
    bookingCount: bookings.length,
    journeyViewCount: journeys.length,
  });

  const relationshipDepth = computeRelationshipDepth({
    hasPhone: !!profile.phone,
    hasCountry: !!profile.country,
    hasSpecialOccasion: !!profile.special_occasion,
    hasAnniversaryDate: !!profile.anniversary_date,
    hasDietaryRestrictions: Array.isArray(profile.dietary_restrictions) && profile.dietary_restrictions.length > 0,
    hasInterests: Array.isArray(profile.interests) && profile.interests.length > 0,
    hasPastDestinations: Array.isArray(profile.past_destinations) && profile.past_destinations.length > 0,
    hasWishlist: Array.isArray(profile.wishlist) && profile.wishlist.length > 0,
    hasNotes: !!profile.notes,
    interactionCount: communications.length,
    bookingCount: bookings.length,
  });

  const averageBookingValue = bookings.length > 0
    ? bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) / bookings.length
    : 0;

  const totalSpent = profile.total_spent || 0;

  const leadScore = Math.max(
    engagementScore,
    Math.round(relationshipDepth * 0.6 + engagementScore * 0.4)
  );

  const ltvPrediction = computeLtvPrediction({
    totalSpent,
    bookingCount: bookings.length,
    averageBookingValue,
    leadScore,
    isVip: profile.is_vip,
    occasionType: profile.special_occasion,
  });

  const churnRisk = computeChurnRisk({
    daysSinceLastContact,
    daysSinceLastTrip,
    hasOpenInquiry,
    hasUpcomingBooking,
    engagementScore,
  });

  const primarySegment = classifyPrimarySegment(profile, bookings, inquiries);
  const valueSegment = classifyValueSegment(totalSpent, bookings.length, profile.is_vip);
  const lifecycle = classifyLifecycle(inquiries, bookings, journeys, daysSinceLastContact);

  const nextAction = recommendNextAction({
    engagementScore,
    leadTier: leadScore >= 60 ? "hot" : leadScore >= 30 ? "warm" : "cold",
    churnRisk,
    hasOpenInquiry,
    daysSinceLastContact,
    daysUntilOccasion,
    hasUpcomingBooking,
    lifecycle,
  });

  const conversionRate = inquiries.length > 0
    ? bookings.length / inquiries.length
    : 0;

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    country: profile.country,
    isCouple: profile.is_couple,
    specialOccasion: profile.special_occasion,
    specialOccasionDate: profile.special_occasion_date,
    anniversaryDate: profile.anniversary_date,
    preferences: {
      travelStyle: profile.travel_style || "mixed",
      accommodationStyle: profile.accommodation_style || "luxury-resort",
      activityLevel: profile.activity_level || "moderate",
      budgetRange: profile.budget_range || "premium",
      dietaryRestrictions: profile.dietary_restrictions || [],
      interests: profile.interests || [],
    },
    source: profile.source || "website",
    referralSource: profile.referral_source,
    tags: profile.tags || [],
    isVip: profile.is_vip || false,
    notes: profile.notes,
    intelligence: {
      engagementScore,
      relationshipDepth,
      leadScore,
      leadTier: leadScore >= 60 ? "hot" : leadScore >= 30 ? "warm" : "cold",
      ltvPrediction,
      churnRisk,
      nextAction,
      daysSinceLastContact,
      daysUntilOccasion,
    },
    stats: {
      totalInquiries: inquiries.length,
      totalBookings: bookings.length,
      totalJourneys: journeys.length,
      totalSpent,
      averageBookingValue,
      conversionRate,
      lastTripDate: profile.last_trip_date,
      lastContactedAt: profile.last_contacted_at,
    },
    recentInteractions: communications.slice(0, 20),
    recentBookings: bookings.slice(0, 5),
    recentJourneys: journeys.slice(0, 5),
    recentInquiries: inquiries.slice(0, 5),
    segment: {
      primary: primarySegment,
      value: valueSegment,
      lifecycle,
    },
    emailOptIn: profile.email_opt_in !== false,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

// ─── 4. Segment Classification ────────────────────────────────────────────

function classifyPrimarySegment(
  profile: Record<string, unknown>,
  bookings: CustomerBooking[],
  inquiries: CustomerInquiry[]
): CustomerIntelligence["segment"]["primary"] {
  const occasion = profile.special_occasion as string | undefined;

  if (occasion === "honeymoon") return "honeymoon";
  if (occasion === "anniversary") return "anniversary";
  if (occasion === "proposal" || occasion === "elopement") return "proposal";
  if (bookings.length > 1) return "repeat";

  const destinations = new Set<string>();
  for (const b of bookings) {
    if (b.destinations) b.destinations.forEach(d => destinations.add(d));
  }
  for (const i of inquiries) {
    if (i.destinations) i.destinations.forEach(d => destinations.add(d));
  }

  if (destinations.has("south-luangwa")) return "safari";
  if (destinations.has("lake-malawi") || destinations.has("zanzibar")) return "beach";

  return "new";
}

function classifyValueSegment(
  totalSpent: number,
  bookingCount: number,
  isVip: boolean
): CustomerIntelligence["segment"]["value"] {
  if (isVip || totalSpent > 15000) return "vip";
  if (totalSpent > 5000 || bookingCount > 1) return "high";
  if (totalSpent > 1000) return "medium";
  return "low";
}

function classifyLifecycle(
  inquiries: CustomerInquiry[],
  bookings: CustomerBooking[],
  journeys: CustomerJourney[],
  daysSinceLastContact: number
): CustomerIntelligence["segment"]["lifecycle"] {
  if (bookings.length > 0) {
    const hasFutureBooking = bookings.some(b => {
      const start = b.startDate ? new Date(b.startDate) : null;
      return start && start > new Date();
    });
    if (hasFutureBooking) return "booked";

    const lastBooking = bookings[0];
    const lastTrip = lastBooking.endDate ? new Date(lastBooking.endDate) : null;
    if (lastTrip && lastTrip < new Date()) return "travelled";

    if (bookings.length > 1) return "returned";
  }

  if (journeys.some(j => j.status === "sent" || j.status === "viewed")) return "quoted";

  if (inquiries.length > 0) return "inquiry";

  if (daysSinceLastContact > 180) return "dormant";

  return "prospect";
}

// ─── 5. Timeline Construction ─────────────────────────────────────────────

/**
 * Build a unified timeline of all customer interactions across channels.
 * Sorted by date descending (most recent first).
 */
export async function getCustomerTimeline(guestProfileId: string): Promise<CustomerInteraction[]> {
  const supabase = createAdminClient();

  const [commsResult, bookingsResult, journeysResult, inquiriesResult] = await Promise.all([
    supabase
      .from("guest_communications")
      .select("id, channel, direction, subject, body, related_booking_id, related_inquiry_id, admin_id, created_at")
      .eq("guest_profile_id", guestProfileId),
    supabase
      .from("bookings")
      .select("id, booking_reference, status, created_at")
      .eq("guest_profile_id", guestProfileId),
    supabase
      .from("saved_journeys")
      .select("id, title, quote_ref, status, created_at")
      .eq("guest_profile_id", guestProfileId),
    supabase
      .from("inquiries")
      .select("id, status, message, created_at")
      .eq("guest_profile_id", guestProfileId),
  ]);

  const interactions: CustomerInteraction[] = [];

  for (const c of (commsResult.data || [])) {
    interactions.push({
      id: c.id,
      channel: c.channel as CustomerInteraction["channel"],
      direction: c.direction as CustomerInteraction["direction"],
      subject: c.subject,
      body: c.body,
      relatedBookingId: c.related_booking_id,
      relatedInquiryId: c.related_inquiry_id,
      adminId: c.admin_id,
      createdAt: c.created_at,
    });
  }

  for (const b of (bookingsResult.data || [])) {
    interactions.push({
      id: b.id,
      channel: "booking",
      direction: "outbound",
      subject: `Booking ${b.booking_reference} — ${b.status}`,
      relatedBookingId: b.id,
      createdAt: b.created_at,
    });
  }

  for (const j of (journeysResult.data || [])) {
    interactions.push({
      id: j.id,
      channel: "journey",
      direction: "outbound",
      subject: `Journey "${j.title}" (${j.quote_ref || "no ref"}) — ${j.status}`,
      relatedJourneyId: j.id,
      createdAt: j.created_at,
    });
  }

  for (const i of (inquiriesResult.data || [])) {
    interactions.push({
      id: i.id,
      channel: "inquiry",
      direction: "inbound",
      subject: `Inquiry — ${i.status}`,
      body: i.message,
      relatedInquiryId: i.id,
      createdAt: i.created_at,
    });
  }

  interactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return interactions;
}

// ─── 6. Bulk Intelligence (for dashboard) ──────────────────────────────────

/**
 * Get intelligence summary for all customers (for dashboard/list view).
 * Returns lightweight summary without full interaction history.
 */
export async function getAllCustomerIntelligence(): Promise<{
  customers: Array<{
    id: string;
    fullName: string;
    email: string;
    isVip: boolean;
    engagementScore: number;
    leadTier: string;
    ltvPrediction: number;
    churnRisk: number;
    totalBookings: number;
    totalSpent: number;
    segment: CustomerIntelligence["segment"];
    daysSinceLastContact: number;
    nextAction: string;
  }>;
  summary: {
    totalCustomers: number;
    vipCount: number;
    hotLeads: number;
    atRiskCount: number;
    averageEngagement: number;
    totalLifetimeValue: number;
  };
}> {
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from("guest_profiles")
    .select("id, full_name, email, is_vip, total_bookings, total_spent, last_contacted_at, special_occasion, tags, source")
    .order("total_spent", { ascending: false });

  if (!profiles || profiles.length === 0) {
    return {
      customers: [],
      summary: {
        totalCustomers: 0,
        vipCount: 0,
        hotLeads: 0,
        atRiskCount: 0,
        averageEngagement: 0,
        totalLifetimeValue: 0,
      },
    };
  }

  const now = new Date();
  const customers = profiles.map(p => {
    const lastContacted = p.last_contacted_at ? new Date(p.last_contacted_at) : null;
    const daysSinceLastContact = lastContacted
      ? Math.floor((now.getTime() - lastContacted.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const engagementScore = daysSinceLastContact <= 7 ? 80
      : daysSinceLastContact <= 30 ? 60
      : daysSinceLastContact <= 90 ? 30
      : 10;

    const leadTier = engagementScore >= 60 ? "hot" : engagementScore >= 30 ? "warm" : "cold";
    const ltvPrediction = p.total_spent || 0;
    const churnRisk = daysSinceLastContact > 180 ? 0.7 : daysSinceLastContact > 90 ? 0.3 : 0.1;

    const primarySegment = p.special_occasion === "honeymoon" ? "honeymoon"
      : p.special_occasion === "anniversary" ? "anniversary"
      : (p.total_bookings || 0) > 1 ? "repeat"
      : "new";

    return {
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      isVip: p.is_vip || false,
      engagementScore,
      leadTier,
      ltvPrediction,
      churnRisk,
      totalBookings: p.total_bookings || 0,
      totalSpent: p.total_spent || 0,
      segment: {
        primary: primarySegment as CustomerIntelligence["segment"]["primary"],
        value: (p.is_vip ? "vip" : (p.total_spent || 0) > 5000 ? "high" : (p.total_spent || 0) > 1000 ? "medium" : "low") as CustomerIntelligence["segment"]["value"],
        lifecycle: "prospect" as CustomerIntelligence["segment"]["lifecycle"],
      },
      daysSinceLastContact,
      nextAction: daysSinceLastContact > 90
        ? "Re-engage: Customer has not been contacted in over 90 days."
        : "Monitor: Customer is in a healthy state.",
    };
  });

  const summary = {
    totalCustomers: customers.length,
    vipCount: customers.filter(c => c.isVip).length,
    hotLeads: customers.filter(c => c.leadTier === "hot").length,
    atRiskCount: customers.filter(c => c.churnRisk > 0.5).length,
    averageEngagement: Math.round(customers.reduce((sum, c) => sum + c.engagementScore, 0) / customers.length),
    totalLifetimeValue: customers.reduce((sum, c) => sum + c.ltvPrediction, 0),
  };

  return { customers, summary };
}

// ─── 7. Interaction Logging ───────────────────────────────────────────────

export interface LogInteractionInput {
  guestProfileId: string;
  channel: "email" | "call" | "whatsapp" | "sms" | "meeting" | "note";
  direction: "inbound" | "outbound";
  subject?: string;
  body?: string;
  relatedBookingId?: string;
  relatedInquiryId?: string;
  adminId?: string;
}

/**
 * Log a customer interaction to guest_communications and update the
 * profile's last_contacted_at. Call this at every touchpoint so the
 * CRM timeline stays complete.
 */
export async function logInteraction(input: LogInteractionInput): Promise<boolean> {
  const supabase = createAdminClient();

  const { error: commError } = await supabase
    .from("guest_communications")
    .insert({
      guest_profile_id: input.guestProfileId,
      channel: input.channel,
      direction: input.direction,
      subject: input.subject,
      body: input.body,
      related_booking_id: input.relatedBookingId ?? null,
      related_inquiry_id: input.relatedInquiryId ?? null,
      admin_id: input.adminId ?? null,
    });

  if (commError) {
    console.error("Failed to log interaction:", commError.message);
    return false;
  }

  await supabase
    .from("guest_profiles")
    .update({ last_contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", input.guestProfileId);

  return true;
}
