// Romance Intelligence (Master OS §6) and customer relationship memory.
//
// Two agents: romance-agent, relationship-agent.
//
// romance-agent designs the emotional arc of a journey: Emotion -> Story ->
// Experience -> Destination -> Journey -> Memory. What makes this computable
// rather than decorative is that Kivara already stores the inputs on
// guest_profiles: special_occasion, anniversary_date, travel_style,
// activity_level, budget_range, interests, wishlist, past_destinations. The agent
// maps those real recorded fields onto the emotion arc, so the arc describes a
// specific guest rather than a generic honeymoon.
//
// relationship-agent maintains relationship memory. Its registry permissions
// are unusually firm: "no unsolicited outreach" and "escalate relationship-risk
// customers to the founder". So the output is guidance and risk, never a send
// action, and any guest the agent would classify as at-risk is flagged rather
// than contacted.

import {
  report,
  evidenceFor,
  type AgentReport,
  type PlatformSnapshot,
  type GuestFact,
} from "@/lib/ai/capabilities/data";

// ─── romance-agent ────────────────────────────────────────────────────────────

/** One stage of the Emotion -> Memory arc the registry specifies. */
export interface ArcStage {
  stage:
    | "emotion"
    | "story"
    | "experience"
    | "destination"
    | "journey"
    | "memory";
  /** Built from that guest's real recorded fields. */
  direction: string;
  /** True when the stage had to be left general because no data supports it. */
  inferred: boolean;
}

export interface EmotionalProfile {
  guestId: string;
  guestName: string | null;
  occasion: string | null;
  travelStyle: string | null;
  activityLevel: string | null;
  budgetRange: string | null;
  interests: string[];
  wishlist: string[];
  /** True when the arc rests mostly on absent data rather than recorded fields. */
  arcIsPredominantlyInferred: boolean;
  arc: ArcStage[];
  /** Occasions the registry sends to a human rather than designing around. */
  requiresHumanSteward: boolean;
}

export interface RomanceFindings {
  profiles: EmotionalProfile[];
  /** Occasion mix across the guest base, for brand planning. */
  occasionMix: { occasion: string; guests: number }[];
  sensitiveOccasionCount: number;
}

const UNSPECIFIED = new Set(["", "unspecified", "none", "null", "undefined"]);

function isBlank(v: string | null): boolean {
  return v === null || UNSPECIFIED.has(v.trim().toLowerCase());
}

/**
 * Occasions where a wrong guess is expensive enough to warrant a human steward.
 * Deliberately conservative: anything involving health, law or bereavement is
 * excluded from automated design.
 */
const SENSITIVE_OCCASION_TERMS = [
  "wedding",
  "vow",
  "funeral",
  "memorial",
  "bereav",
  "rehab",
  "medical",
  "surgery",
  "loss",
];

function isSensitiveOccasion(occasion: string | null): boolean {
  if (isBlank(occasion)) return false;
  const value = (occasion as string).toLowerCase();
  return SENSITIVE_OCCASION_TERMS.some((term) => value.includes(term));
}

/**
 * Build the emotional arc for one guest from that guest's recorded profile.
 * Every stage names the direction it implies and marks itself `inferred` when no
 * recorded field supports it, so the curator can see which parts of the arc are
 * grounded in data and which are assumptions.
 */
export function buildEmotionalProfile(guest: GuestFact): EmotionalProfile {
  const occasion = isBlank(guest.specialOccasion) ? null : guest.specialOccasion;
  const style = isBlank(guest.travelStyle) ? null : guest.travelStyle;
  const level = isBlank(guest.activityLevel) ? null : guest.activityLevel;
  const budget = isBlank(guest.budgetRange) ? null : guest.budgetRange;

  const arc: ArcStage[] = [
    {
      stage: "emotion",
      direction: occasion
        ? `Centre the whole journey on the ${occasion}: the guest is marking something, and the trip has to feel like a consequence of it.`
        : "No occasion is recorded, so the emotional register has to be inferred from travel style alone.",
      inferred: occasion === null,
    },
    {
      stage: "story",
      direction:
        occasion && style
          ? `A ${occasion} told as a ${style} story: one narrative the guest is inside of, not a list of activities.`
          : occasion
            ? `A ${occasion} narrative. Travel style is not recorded, so tone is set by the occasion only.`
            : "No occasion or travel style recorded, so there is no grounded story to design.",
      inferred: occasion === null || style === null,
    },
    {
      stage: "experience",
      direction: level
        ? `Calibrate physical intensity to a ${level} activity level rather than the itinerary default.`
        : "Activity level is not recorded, so intensity must be confirmed with the guest before booking anything physical.",
      inferred: level === null,
    },
    {
      stage: "destination",
      direction:
        guest.interests.length > 0
          ? `Weight the destinations this guest has recorded interest in: ${guest.interests.join(", ")}.`
          : guest.wishlist.length > 0
            ? `No recorded interests, but a wishlist of ${guest.wishlist.join(", ")} gives the destination choice a starting point.`
            : "No recorded interest or wishlist maps to a destination, so destination choice is unconstrained by data.",
      inferred: guest.interests.length === 0 && guest.wishlist.length === 0,
    },
    {
      stage: "journey",
      direction: budget
        ? `Hold the journey inside the recorded ${budget} band and never present a cheaper option as the recommendation.`
        : "No budget band is recorded, so pricing boundaries are unstated and must be set before quoting.",
      inferred: budget === null,
    },
    {
      stage: "memory",
      direction: guest.lastTripDate !== null || guest.tags.length > 0
        ? "Design one moment the guest will narrate afterwards; the recorded trip history gives this a starting point."
        : "No trip history or interests recorded, so the memory anchor has to be created rather than extended.",
      inferred: guest.lastTripDate === null && guest.tags.length === 0,
    },
  ];

  return {
    guestId: guest.id,
    guestName: guest.name,
    occasion,
    travelStyle: style,
    activityLevel: level,
    budgetRange: budget,
    interests: guest.interests,
    wishlist: guest.wishlist,
    arc,
    // A curator reading this needs to know at a glance whether the arc is a
    // reading of a well-recorded guest or largely a set of assumptions.
    arcIsPredominantlyInferred: arc.filter((s) => s.inferred).length > arc.length / 2,
    requiresHumanSteward: isSensitiveOccasion(occasion),
  };
}

export function runRomanceAgent(
  snapshot: PlatformSnapshot
): AgentReport<RomanceFindings> {
  const profiles = snapshot.guests.map((guest) => buildEmotionalProfile(guest));

  const occasionCounts = new Map<string, number>();
  for (const guest of snapshot.guests) {
    if (isBlank(guest.specialOccasion)) continue;
    const occasion = guest.specialOccasion as string;
    occasionCounts.set(occasion, (occasionCounts.get(occasion) ?? 0) + 1);
  }

  return report(
    {
      agent: "romance-agent",
      evidenceBasis: evidenceFor("guest_profiles", "destinations"),
      unavailableInputs: [
        "Couple interviews or preference questionnaires (no such capture exists)",
        "Past journey narratives and what guests said about them (not recorded)",
        "Gift, anniversary-surprise or surprise-travel constraints (not collected)",
      ],
      requiresHumanApproval: true,
    },
    {
      profiles,
      occasionMix: [...occasionCounts.entries()]
        .map(([occasion, guests]) => ({ occasion, guests }))
        .sort((a, b) => b.guests - a.guests),
      sensitiveOccasionCount: profiles.filter((p) => p.requiresHumanSteward).length,
    }
  );
}

// ─── relationship-agent ───────────────────────────────────────────────────────

export type RelationshipRisk = "none" | "watch" | "at-risk";

export interface RelationshipNote {
  guestId: string;
  guestName: string | null;
  email: string | null;
  bookings: number;
  totalSpend: number;
  isVip: boolean;
  lastContactedAt: string | null;
  lastTripDate: string | null;
  risk: RelationshipRisk;
  /** Why the risk was assigned. Empty when risk is "none". */
  riskReasons: string[];
  /** Guidance for whoever does contact this guest. Never an action. */
  communicationGuidance: string;
  /** The registry forbids unsolicited outreach from this agent entirely. */
  outreachPermittedByThisAgent: false;
}

export interface RelationshipFindings {
  notes: RelationshipNote[];
  atRisk: RelationshipNote[];
  watch: RelationshipNote[];
  /** Guests with no recorded contact at all, i.e. relationship memory is empty. */
  neverContacted: RelationshipNote[];
}

/** Relationship risk is a pure function of the recorded guest row, never a clock read. */
const NEVER_CONTACTED = "never";

export function assessRelationship(guest: GuestFact): RelationshipNote {
  const riskReasons: string[] = [];
  let risk: RelationshipRisk = "none";

  const lastContacted = guest.lastContactedAt;
  const contacted = lastContacted !== null && lastContacted !== NEVER_CONTACTED;

  if (!contacted && guest.bookings > 0) {
    // Travelled with us and we have no record of ever speaking to them.
    riskReasons.push(
      `Guest has ${guest.bookings} booking(s) but no recorded contact, so relationship memory is empty`
    );
    risk = "at-risk";
  } else if (!contacted) {
    riskReasons.push("No contact has ever been recorded for this guest");
    risk = "watch";
  }

  if (guest.isVip === true && !contacted) {
    riskReasons.push("Guest is flagged VIP with no recorded contact");
    risk = "at-risk";
  }

  // An occasion on file that has passed, with no later contact, is a missed
  // moment rather than a dormant relationship.
  if (guest.specialOccasion && guest.lastTripDate === null && guest.bookings === 0) {
    riskReasons.push(
      `A ${guest.specialOccasion} is recorded but nothing has been booked, so the occasion may pass unremarked`
    );
    risk = risk === "none" ? "watch" : risk;
  }

  if (guest.totalSpend > 0 && guest.bookings <= 1) {
    riskReasons.push(
      "High-value guest with a single booking; repeat and referral behaviour usually follows satisfaction"
    );
    risk = risk === "none" ? "watch" : risk;
  }

  const guidance: string[] = [];
  if (guest.isVip === true) guidance.push("Treat as VIP: personal, calm, never automated-sounding");
  if (guest.specialOccasion) guidance.push(`Reference the ${guest.specialOccasion} only if the guest raises it`);
  if (guest.budgetRange) guidance.push(`Stay inside the recorded ${guest.budgetRange} band`);
  if (!contacted) guidance.push("Do not open with a sales message: establish context before any offer");
  if (guest.tags.length > 0) guidance.push(`Known interests: ${guest.tags.join(", ")}`);
  guidance.push("Never send anything unsolicited; the registry gives this agent no outreach authority");

  return {
    guestId: guest.id,
    guestName: guest.name,
    email: guest.email,
    bookings: guest.bookings,
    totalSpend: guest.totalSpend,
    isVip: guest.isVip === true,
    lastContactedAt: lastContacted,
    lastTripDate: guest.lastTripDate,
    risk,
    riskReasons,
    communicationGuidance: guidance.join(". "),
    outreachPermittedByThisAgent: false,
  };
}

export function runRelationshipAgent(
  snapshot: PlatformSnapshot
): AgentReport<RelationshipFindings> {
  const notes = snapshot.guests.map((guest) => assessRelationship(guest));

  return report(
    {
      agent: "relationship-agent",
      evidenceBasis: evidenceFor("guest_profiles", "bookings"),
      unavailableInputs: [
        "Email open and reply history (no message log is read)",
        "Call notes and in-person interactions (not recorded)",
        "Consent and unsubscribe state per guest (email_opt_in exists but is not read here)",
        "Guest satisfaction and NPS (never collected)",
      ],
      requiresHumanApproval: true,
    },
    {
      notes,
      atRisk: notes.filter((n) => n.risk === "at-risk"),
      watch: notes.filter((n) => n.risk === "watch"),
      neverContacted: notes.filter((n) => n.lastContactedAt === null),
    }
  );
}

export const ROMANCE_AGENTS = {
  "romance-agent": runRomanceAgent,
  "relationship-agent": runRelationshipAgent,
} as const;
