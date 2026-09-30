// ─── Kivara AI Guest Profiler ──────────────────────────────────────────
// Extracts structured guest preferences from raw inquiry text.
// Uses LLM (Gemini/DeepSeek) for deep analysis, with rule-based fallback.

import type { GuestProfile } from "./types";
import { callLlmJson, type LlmMessage } from "./llm";
import { normalizeUuid } from "./uuid";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RawInquiry {
  fullName: string;
  email: string;
  phone?: string;
  destination?: string;
  preferredDates?: string;
  guests?: number;
  message: string;
}

/** How a profile was derived. Load-bearing: confidence depends on it. */
export type ProfilingMethod = "rules" | "llm";

export interface ProfiledGuest extends GuestProfile {
  source: "website" | "whatsapp" | "email" | "referral";
  inquiryId?: string;
  leadScore: number;
  leadTier: "hot" | "warm" | "cold";
  extractedPreferences: string[];
  extractedBudget?: string;
  extractedOccasion?: string;
  extractedDestinations: string[];
  /**
   * Recorded because the confidence attached to a psychographic
   * classification depends entirely on which path produced it. A label whose
   * provenance is unknown can be neither trusted nor re-derived later.
   */
  profilingMethod: ProfilingMethod;
  /**
   * The model's stated reasoning, on the LLM path. This used to be requested
   * from the model and then discarded, throwing away the only explanation of
   * why a guest was labelled the way they were.
   */
  reasoning?: string;
}

// ─── Keyword Patterns ──────────────────────────────────────────────────

const OCCASION_PATTERNS: { keywords: string[]; occasion: string }[] = [
  { keywords: ["honeymoon", "newlywed", "just married", "wedding"], occasion: "honeymoon" },
  { keywords: ["anniversary", "years", "celebration"], occasion: "anniversary" },
  { keywords: ["birthday", "birth day"], occasion: "birthday" },
  { keywords: ["proposal", "propose", "engagement", "will you marry"], occasion: "proposal" },
  { keywords: ["babymoon", "baby moon"], occasion: "babymoon" },
  { keywords: ["elopement", "elope", "eloping", "private wedding"], occasion: "elopement" },
];

const TRAVEL_STYLE_PATTERNS: { keywords: string[]; style: GuestProfile["preferences"]["travelStyle"] }[] = [
  { keywords: ["romantic", "couples", "private", "intimate", "secluded", "just the two of us"], style: "romantic" },
  { keywords: ["adventure", "safari", "walking", "trek", "active", "explore", "wilderness", "bush", "game drive"], style: "adventure" },
  { keywords: ["relax", "spa", "beach", "pool", "peaceful", "serene", "quiet", "tranquil", "unwind"], style: "relaxation" },
  { keywords: ["culture", "village", "local", "heritage", "history", "stone town", "museum"], style: "cultural" },
  { keywords: ["mix", "combination", "variety", "different", "both", "all"], style: "mixed" },
];

const ACCOMMODATION_PATTERNS: { keywords: string[]; style: GuestProfile["preferences"]["accommodationStyle"] }[] = [
  { keywords: ["villa", "private house", "exclusive", "private pool", "butler"], style: "private-villa" },
  { keywords: ["luxury", "resort", "5-star", "five star", "all-inclusive", "premium"], style: "luxury-resort" },
  { keywords: ["boutique", "intimate", "small", "charming", "unique", "design"], style: "intimate-boutique" },
  { keywords: ["tent", "camp", "eco", "safari camp", "bush camp", "authentic", "rustic"], style: "eco-camp" },
];

const BUDGET_PATTERNS: { keywords: string[]; range: "premium" | "ultra-luxury" }[] = [
  { keywords: ["ultra", "best", "finest", "most exclusive", "top", "no limit", "luxury", "five star", "unlimited"], range: "ultra-luxury" },
  { keywords: ["value", "mid-range", "moderate", "reasonable", "budget", "cost-effective"], range: "premium" },
];

const ACTIVITY_PATTERNS: { keywords: string[]; level: "low" | "moderate" | "high" }[] = [
  { keywords: ["relax", "spa", "lazy", "slow", "gentle", "leisurely", "rest"], level: "low" },
  { keywords: ["active", "hike", "walking", "safari", "kayak", "dive", "snorkel", "explore", "adventure", "strenuous"], level: "high" },
];

const DESTINATION_KEYWORDS: { keywords: string[]; destination: string }[] = [
  { keywords: ["malawi", "lake malawi", "likoma", "kaya mawa"], destination: "lake-malawi" },
  { keywords: ["luangwa", "south luangwa", "zambia", "safari", "walking safari", "lusaka"], destination: "south-luangwa" },
  { keywords: ["zanzibar", "tanzania", "stone town", "spice island"], destination: "zanzibar" },
];

// ─── Scoring Weights ──────────────────────────────────────────────────

const LEAD_SCORE_WEIGHTS = {
  hasDestination: 15,
  hasDates: 15,
  hasPhone: 10,
  isCouple: 10,
  specificOccasion: 20,
  detailedMessage: 15,
  explicitBudget: 15,
  multipleDestinations: 10,
  inquiryLength: { min: 5, max: 15 }, // points per 50 chars
  referralSource: 20,
};

// ─── Profiler ──────────────────────────────────────────────────────────

/** Narrow a loose string to one of a fixed set of literal options. */
function isOneOf<T extends readonly string[]>(
  value: string | null | undefined,
  options: T
): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

export class GuestProfiler {
  /**
   * Extract structured guest profile from raw inquiry data.
   * Returns a fully populated GuestProfile with lead score.
   */
  profile(raw: RawInquiry): ProfiledGuest {
    const text = `${raw.message} ${raw.destination || ""} ${raw.preferredDates || ""}`.toLowerCase();
    const destinationList = this.extractDestinations(raw, text);
    const occasion = this.extractOccasion(text);
    const travelStyle = this.classifyTravelStyle(text);
    const accommodationStyle = this.classifyAccommodation(text);
    const activityLevel = this.classifyActivityLevel(text);
    const budgetRange = this.classifyBudget(text);

    const isCouple = this.isLikelyCouple(raw, text, occasion);

    const guest: ProfiledGuest = {
      id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: raw.fullName,
      email: raw.email,
      isCouple,
      specialOccasion: occasion,
      preferences: {
        travelStyle,
        accommodationStyle,
        activityLevel,
        budgetRange,
        interests: this.extractInterests(text),
      },
      source: "website",
      inquiryId: undefined,
      leadScore: 0,
      leadTier: "cold",
      extractedPreferences: [],
      extractedDestinations: destinationList,
      extractedOccasion: occasion,
      extractedBudget: budgetRange,
      profilingMethod: "rules",
    };

    guest.leadScore = this.calculateLeadScore(raw, guest);
    guest.leadTier = this.getLeadTier(guest.leadScore);

    return guest;
  }

  private extractDestinations(raw: RawInquiry, text: string): string[] {
    const destinations: string[] = [];
    if (raw.destination) {
      for (const kw of DESTINATION_KEYWORDS) {
        if (kw.keywords.some(k => raw.destination!.toLowerCase().includes(k))) {
          if (!destinations.includes(kw.destination)) destinations.push(kw.destination);
        }
      }
    }
    for (const kw of DESTINATION_KEYWORDS) {
      if (kw.keywords.some(k => text.includes(k))) {
        if (!destinations.includes(kw.destination)) destinations.push(kw.destination);
      }
    }
    return destinations.length > 0 ? destinations : ["lake-malawi"]; // default
  }

  private extractOccasion(text: string): string | undefined {
    for (const pattern of OCCASION_PATTERNS) {
      if (pattern.keywords.some(k => text.includes(k))) {
        return pattern.occasion;
      }
    }
    return undefined;
  }

  private classifyTravelStyle(text: string): GuestProfile["preferences"]["travelStyle"] {
    const scores = new Map<string, number>();
    for (const pattern of TRAVEL_STYLE_PATTERNS) {
      const count = pattern.keywords.filter(k => text.includes(k)).length;
      if (count > 0) scores.set(pattern.style, count);
    }

    // Default to mixed if nothing found
    if (scores.size === 0) return "mixed";

    // Return the highest scoring style
    let bestStyle = "mixed" as GuestProfile["preferences"]["travelStyle"];
    let bestScore = 0;
    for (const [style, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestStyle = style as GuestProfile["preferences"]["travelStyle"];
      }
    }
    return bestStyle;
  }

  private classifyAccommodation(text: string): GuestProfile["preferences"]["accommodationStyle"] {
    const scores = new Map<string, number>();
    for (const pattern of ACCOMMODATION_PATTERNS) {
      const count = pattern.keywords.filter(k => text.includes(k)).length;
      if (count > 0) scores.set(pattern.style, count);
    }
    if (scores.size === 0) return "luxury-resort";
    let bestStyle = "luxury-resort" as GuestProfile["preferences"]["accommodationStyle"];
    let bestScore = 0;
    for (const [style, score] of scores) {
      if (score > bestScore) { bestScore = score; bestStyle = style as GuestProfile["preferences"]["accommodationStyle"]; }
    }
    return bestStyle;
  }

  private classifyActivityLevel(text: string): GuestProfile["preferences"]["activityLevel"] {
    const scores = new Map<string, number>();
    for (const pattern of ACTIVITY_PATTERNS) {
      const count = pattern.keywords.filter(k => text.includes(k)).length;
      if (count > 0) scores.set(pattern.level, count);
    }
    if (scores.size === 0) return "moderate";
    let bestLevel: "low" | "moderate" | "high" = "moderate";
    let bestScore = 0;
    for (const [level, score] of scores) {
      if (score > bestScore) { bestScore = score; bestLevel = level as "low" | "moderate" | "high"; }
    }
    return bestLevel;
  }

  private classifyBudget(text: string): "premium" | "ultra-luxury" {
    const scores = new Map<string, number>();
    for (const pattern of BUDGET_PATTERNS) {
      const count = pattern.keywords.filter(k => text.includes(k)).length;
      if (count > 0) scores.set(pattern.range, count);
    }
    if (scores.size === 0) return "premium";
    const ultraScore = scores.get("ultra-luxury") || 0;
    const premiumScore = scores.get("premium") || 0;
    return ultraScore >= premiumScore ? "ultra-luxury" : "premium";
  }

  private isLikelyCouple(raw: RawInquiry, text: string, occasion?: string): boolean {
    if (occasion && ["honeymoon", "anniversary", "proposal", "babymoon"].includes(occasion)) return true;
    const coupleWords = ["we", "us", "our", "husband", "wife", "fiancé", "fiance", "partner", "together", "couple", "both"];
    const nameAndPattern = raw.fullName.toLowerCase().includes("&") || raw.fullName.toLowerCase().includes(" and ");
    return coupleWords.some(w => text.includes(w)) || nameAndPattern;
  }

  private extractInterests(text: string): string[] {
    const interestMap: { keywords: string[]; interest: string }[] = [
      { keywords: ["safari", "wildlife", "game drive", "leopard", "elephant", "lion", "bird"], interest: "wildlife" },
      { keywords: ["spa", "massage", "wellness", "yoga", "meditation"], interest: "wellness" },
      { keywords: ["diving", "snorkel", "scuba", "kayak", "water", "beach", "swim"], interest: "water-sports" },
      { keywords: ["cooking", "food", "wine", "cuisine", "gastronomy", "dining"], interest: "gastronomy" },
      { keywords: ["walking", "hike", "trek", "nature walk"], interest: "walking-safari" },
      { keywords: ["photography", "photo", "camera", "pictures"], interest: "photography" },
      { keywords: ["culture", "village", "local", "community", "heritage"], interest: "cultural" },
      { keywords: ["sunset", "sunrise", "stargazing", "stars", "sky"], interest: "romantic-moments" },
    ];
    const interests: string[] = [];
    for (const im of interestMap) {
      if (im.keywords.some(k => text.includes(k))) interests.push(im.interest);
    }
    return interests;
  }

  private calculateLeadScore(raw: RawInquiry, guest: ProfiledGuest): number {
    let score = 0;

    // Has destination
    if (guest.extractedDestinations.length > 0) score += LEAD_SCORE_WEIGHTS.hasDestination;
    if (guest.extractedDestinations.length > 1) score += LEAD_SCORE_WEIGHTS.multipleDestinations;

    // Has dates
    if (raw.preferredDates) score += LEAD_SCORE_WEIGHTS.hasDates;

    // Has phone
    if (raw.phone) score += LEAD_SCORE_WEIGHTS.hasPhone;

    // Is couple
    if (guest.isCouple) score += LEAD_SCORE_WEIGHTS.isCouple;

    // Specific occasion
    if (guest.specialOccasion) score += LEAD_SCORE_WEIGHTS.specificOccasion;

    // Message length (detailed inquiry = more interested)
    const lengthScore = Math.min(Math.floor(raw.message.length / 50) * LEAD_SCORE_WEIGHTS.inquiryLength.min, LEAD_SCORE_WEIGHTS.inquiryLength.max);
    score += lengthScore;

    // Explicit budget mention
    if (guest.extractedBudget) score += LEAD_SCORE_WEIGHTS.explicitBudget;

    // Source
    if (guest.source === "referral") score += LEAD_SCORE_WEIGHTS.referralSource;

    return Math.min(score, 100);
  }

  private getLeadTier(score: number): "hot" | "warm" | "cold" {
    if (score >= 60) return "hot";
    if (score >= 30) return "warm";
    return "cold";
  }

  // ── LLM-Powered Profiling ─────────────────────────────────────────────

  /**
   * Profile a guest using LLM for deeper semantic understanding.
   * Falls back to rule-based profiling if LLM is unavailable.
   */
  async llmProfile(raw: RawInquiry): Promise<ProfiledGuest> {
    try {
      const systemPrompt = `You are a luxury travel concierge specializing in Africa's most exclusive destinations. Your task is to analyze a guest inquiry and extract structured profile data.

KIVARA operates three destinations:
1. **Lake Malawi** : freshwater archipelago, barefoot luxury, intimate beach properties (Kaya Mawa, Pumulani, The Makokola Retreat)
2. **South Luangwa** : Zambia's premier walking safari destination, wildlife, luxury camps (Chinzombo, Puku Ridge)
3. **Zanzibar** : Spice Island, white sand beaches, Swahili culture (Xanadu Villas, Baraza Resort & Spa)

Respond in valid JSON only with this exact structure:
{
  "isCouple": boolean,
  "specialOccasion": string | null,
  "travelStyle": "romantic" | "adventure" | "relaxation" | "cultural" | "mixed",
  "accommodationStyle": "intimate-boutique" | "luxury-resort" | "eco-camp" | "private-villa",
  "activityLevel": "low" | "moderate" | "high",
  "budgetRange": "premium" | "ultra-luxury",
  "destinations": string[],
  "interests": string[],
  "leadScore": number (0-100),
  "leadTier": "hot" | "warm" | "cold",
  "extractedPreferences": string[],
  "extractedBudget": string | null,
  "extractedOccasion": string | null,
  "reasoning": string
}`;

      const userMessage = `Analyze this luxury travel inquiry:

Name: ${raw.fullName}
Email: ${raw.email}
${raw.phone ? `Phone: ${raw.phone}` : ""}
${raw.destination ? `Destination Mentioned: ${raw.destination}` : ""}
${raw.preferredDates ? `Preferred Dates: ${raw.preferredDates}` : ""}
Guests: ${raw.guests || "not specified"}

Message:
${raw.message}

Extract the guest's profile. Consider:
1. Are they a couple? (look for "we", "us", "our", "honeymoon", "anniversary", "fiancé", etc.)
2. What special occasion drives this trip?
3. What travel style do they prefer?
4. What accommodation style suits them?
5. What activity level?
6. What budget range do they imply?
7. Which destinations are they interested in?
8. What specific interests do they mention?
9. Score the lead (0-100) based on: detail level, clear occasion, destination knowledge, urgency`;

      const messages: LlmMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ];

      const { data } = await callLlmJson<{
        isCouple: boolean;
        specialOccasion: string | null;
        travelStyle: string;
        accommodationStyle: string;
        activityLevel: string;
        budgetRange: string;
        destinations: string[];
        interests: string[];
        leadScore: number;
        leadTier: string;
        extractedPreferences: string[];
        extractedBudget: string | null;
        extractedOccasion: string | null;
        reasoning: string;
      }>(messages, { temperature: 0.2, maxTokens: 1024 });

      // Validate and normalize the response
      const validStyles = ["romantic", "adventure", "relaxation", "cultural", "mixed"] as const;
      const validAccommodation = ["intimate-boutique", "luxury-resort", "eco-camp", "private-villa"] as const;
      const validActivity = ["low", "moderate", "high"] as const;
      const validBudget = ["premium", "ultra-luxury"] as const;
      const validTiers = ["hot", "warm", "cold"] as const;

      return {
        id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: raw.fullName,
        email: raw.email,
        isCouple: typeof data.isCouple === "boolean" ? data.isCouple : true,
        specialOccasion: typeof data.specialOccasion === "string" ? data.specialOccasion : undefined,
        preferences: {
          travelStyle: isOneOf(data.travelStyle, validStyles)
            ? data.travelStyle
            : "mixed",
          accommodationStyle: isOneOf(data.accommodationStyle, validAccommodation)
            ? data.accommodationStyle
            : "luxury-resort",
          activityLevel: isOneOf(data.activityLevel, validActivity)
            ? data.activityLevel
            : "moderate",
          budgetRange: isOneOf(data.budgetRange, validBudget)
            ? data.budgetRange
            : "premium",
          interests: Array.isArray(data.interests) ? data.interests : [],
        },
        source: "website",
        inquiryId: undefined,
        leadScore: Math.min(100, Math.max(0, typeof data.leadScore === "number" ? data.leadScore : 0)),
        leadTier: isOneOf(data.leadTier, validTiers)
          ? data.leadTier
          : "cold",
        extractedPreferences: Array.isArray(data.extractedPreferences) ? data.extractedPreferences : [],
        extractedBudget: typeof data.extractedBudget === "string" ? data.extractedBudget : undefined,
        extractedOccasion: typeof data.extractedOccasion === "string" ? data.extractedOccasion : data.specialOccasion || undefined,
        extractedDestinations: Array.isArray(data.destinations) && data.destinations.length > 0
          ? data.destinations
          : [raw.destination || "lake-malawi"],
        profilingMethod: "llm",
        reasoning: typeof data.reasoning === "string" && data.reasoning.trim() !== ""
          ? data.reasoning.trim()
          : undefined,
      };
    } catch (err) {
      // LLM failed : fall back to rule-based profiling
      console.warn("LLM profiling failed, using rule-based fallback:", err instanceof Error ? err.message : String(err));
      return this.profile(raw);
    }
  }
}

export const guestProfiler = new GuestProfiler();

// ─── Client DNA persistence (Constitution §XI) ─────────────────────────────
//
// The profiler above is pure: hand it an inquiry, get a profile back, and the
// profile dies with the request. That is survivable for a score, but not for a
// psychographic label — because the next call has to start from zero, and the
// company can never answer "how do we know this guest is a honeymooner?"
//
// Migration 028 gives us `client_dna`: an internal, per-subject classification
// with one active row per subject. Three properties of that table shape how
// this code must be written, and all three are enforced here rather than left
// to the database to complain:
//
//   1. A subject is MANDATORY (`client_dna_subject_required`). The profiler's
//      own `id` is a synthetic `guest-<timestamp>-<random>` slug, not a UUID
//      and not a real row, so it can never be used. A real `leads.id` or
//      `guest_profiles.id` must be supplied, and when neither is a valid UUID
//      we refuse to write rather than let the CHECK abort the insert.
//   2. The unique indexes on `lead_id` / `guest_profile_id` are PARTIAL
//      (`WHERE ... IS NOT NULL`). PostgREST's `.upsert()` emits a plain
//      `ON CONFLICT (col)`, which cannot match a partial index and fails with
//      "no unique or exclusion constraint matching". So this writes with an
//      explicit select-then-write, bumping `version` each time.
//   3. Several columns have no basis in anything the profiler measures.
//
// That last point deserves stating plainly, because the tempting move is to
// fill them. `emotional_drivers`, `emotional_triggers` and `privacy_profile`
// stay EMPTY, and `estimated_lifetime_value` is left unwritten. The profiler
// extracts travel style, activity level, budget band and interests; it does not
// read emotional states, and it has no basis whatsoever for a lifetime value.
// A plausible-looking number in those columns is a fabricated claim, and these
// tables exist precisely so that claims have to be earned (constitution §XI).
// An empty column is honest and can be filled in later by something that
// actually measures the thing.

/** Confidence is a policy about method, not a measurement of the guest. */
const METHOD_CONFIDENCE: Record<ProfilingMethod, number> = {
  // Keyword matching over a short free-text inquiry: weak evidence.
  rules: 20,
  // An LLM reading the same text is better, but still uncalibrated against
  // outcomes, so it does not approach "high". Revisit once lead scoring has
  // been checked against closed deals; until then a high score here would be a
  // number wearing the costume of a result.
  llm: 40,
};

/** A profile with no extracted signal supports no confidence at all. */
const NO_EVIDENCE_CONFIDENCE = 10;

/** Clamp into the 0-100 CHECK range; a value the column rejects is never sent. */
function clampScore(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export interface ClientDnaSubject {
  /** A `leads.id` UUID. Domain lead numbers are not accepted. */
  leadId?: string | null;
  /** A `guest_profiles.id` UUID. */
  guestProfileId?: string | null;
}

/** The snake_case shape sent to the `client_dna` insert/update. */
export interface ClientDnaInsertRow {
  lead_id: string | null;
  guest_profile_id: string | null;
  romance_archetype: string | null;
  emotional_drivers: string[];
  emotional_triggers: string[];
  pacing_profile: Record<string, unknown>;
  luxury_profile: Record<string, unknown>;
  privacy_profile: Record<string, unknown>;
  adventure_profile: Record<string, unknown>;
  destination_affinity: string[];
  accommodation_affinity: string[];
  communication_profile: Record<string, unknown>;
  purchase_intent_score: number;
  personalization_signals: string[];
  confidence_score: number;
  evidence_count: number;
  source: "agent" | "human" | "system";
  version: number;
}

function dedupe(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((v) => typeof v === "string" && v.trim() !== "")));
}

/**
 * How many concrete signals the classification actually rests on. This is real,
 * countable evidence — distinct interests, destinations, preferences and an
 * explicit occasion — rather than a self-assessment.
 */
export function countEvidence(guest: ProfiledGuest): number {
  return (
    dedupe(guest.preferences.interests ?? []).length +
    dedupe(guest.extractedDestinations).length +
    dedupe(guest.extractedPreferences).length +
    (guest.specialOccasion ? 1 : 0)
  );
}

/**
 * Map a profile onto a `client_dna` row. Pure, so the schema's constraints can
 * be tested without a database.
 *
 * Returns null when the subject cannot satisfy the mandatory-subject CHECK —
 * the caller must then skip the write rather than issue an insert the database
 * will reject.
 */
export function buildClientDnaRow(
  guest: ProfiledGuest,
  subject: ClientDnaSubject,
  options?: { version?: number }
): ClientDnaInsertRow | null {
  const leadId = normalizeUuid(subject.leadId);
  const guestProfileId = normalizeUuid(subject.guestProfileId);

  // The CHECK constraint requires at least one, and a slug id is worse than
  // none: it would turn a clear constraint violation into a confusing FK error.
  if (leadId === null && guestProfileId === null) return null;

  const evidence = countEvidence(guest);

  return {
    lead_id: leadId,
    guest_profile_id: guestProfileId,
    // An occasion is a romance archetype; no occasion means no archetype.
    // Defaulting this to something flattering would be inventing a label.
    romance_archetype: guest.specialOccasion ?? null,
    // Unmeasured. See the note above: empty beats fabricated.
    emotional_drivers: [],
    emotional_triggers: [],
    pacing_profile: { activityLevel: guest.preferences.activityLevel },
    luxury_profile: {
      travelStyle: guest.preferences.travelStyle,
      budgetRange: guest.preferences.budgetRange,
    },
    privacy_profile: {},
    adventure_profile: { activityLevel: guest.preferences.activityLevel },
    destination_affinity: dedupe(guest.extractedDestinations),
    accommodation_affinity: [guest.preferences.accommodationStyle],
    communication_profile: { source: guest.source, inquiryId: guest.inquiryId ?? null },
    // leadScore is a commercial signal, already clamped to 0-100 by the
    // profiler; re-clamped here because this column has a CHECK of its own.
    purchase_intent_score: clampScore(guest.leadScore, 0),
    personalization_signals: dedupe([
      ...(guest.preferences.interests ?? []),
      ...guest.extractedPreferences,
    ]),
    confidence_score: clampScore(
      evidence === 0 ? NO_EVIDENCE_CONFIDENCE : METHOD_CONFIDENCE[guest.profilingMethod],
      NO_EVIDENCE_CONFIDENCE
    ),
    evidence_count: evidence,
    source: "agent",
    version: options?.version ?? 1,
  };
}

// ─── Write path ─────────────────────────────────────────────────────────────

export interface ClientDnaExistingRow {
  id: string;
  version: number;
}

export interface ClientDnaSink {
  // PromiseLike, not Promise: the Supabase builder is a thenable, so declaring
  // Promise would make the real client structurally unassignable here.
  findExisting(subject: {
    leadId: string | null;
    guestProfileId: string | null;
  }): PromiseLike<{ data: ClientDnaExistingRow | null; error: { message: string } | null }>;
  insert(row: ClientDnaInsertRow): PromiseLike<{ error: { message: string } | null }>;
  update(
    id: string,
    row: ClientDnaInsertRow
  ): PromiseLike<{ error: { message: string } | null }>;
}

export interface ClientDnaOutcome {
  ok: boolean;
  action: "created" | "updated" | "skipped";
  row: ClientDnaInsertRow | null;
  error: string | null;
}

export function createSupabaseClientDnaSink(): ClientDnaSink {
  // Built inline rather than through a structural adapter: matching Supabase's
  // deeply generic client trips an excessively deep type instantiation. Env is
  // read here, never at module load, so importing this module in a build or
  // test without env vars does not throw.
  const supabase = createAdminClient();
  return {
    findExisting: async (subject) => {
      // Exactly one subject key per row, so this selects a single row. `maybeSingle`
      // distinguishes "no row yet" from "that lookup failed".
      const query = subject.leadId
        ? supabase.from("client_dna").select("id, version").eq("lead_id", subject.leadId).limit(1)
        : supabase
            .from("client_dna")
            .select("id, version")
            .eq("guest_profile_id", subject.guestProfileId)
            .limit(1);

      const { data, error } = await query;
      if (error) return { data: null, error: { message: error.message } };
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || typeof row.id !== "string") return { data: null, error: null };
      return {
        data: {
          id: row.id,
          version: typeof row.version === "number" ? row.version : 1,
        },
        error: null,
      };
    },
    insert: async (row) => {
      const { error } = await supabase.from("client_dna").insert(row);
      return { error: error ? { message: error.message } : null };
    },
    update: async (id, row) => {
      const { error } = await supabase.from("client_dna").update(row).eq("id", id);
      return { error: error ? { message: error.message } : null };
    },
  };
}

let cachedDnaSink: ClientDnaSink | null = null;

function defaultDnaSink(): ClientDnaSink {
  if (!cachedDnaSink) cachedDnaSink = createSupabaseClientDnaSink();
  return cachedDnaSink;
}

/**
 * Persist a profile as the subject's active Client DNA row, bumping `version`
 * on re-profiling.
 *
 * Never throws and never rejects, matching `recordEvent` and `recordQcDecision`:
 * failing to remember a profile must not fail the inquiry that produced it.
 * A subject that cannot be written is reported as `skipped`, not as an error.
 */
export async function persistClientDna(
  guest: ProfiledGuest,
  subject: ClientDnaSubject,
  sink: ClientDnaSink = defaultDnaSink()
): Promise<ClientDnaOutcome> {
  const probe = buildClientDnaRow(guest, subject);
  if (probe === null) {
    return {
      ok: true,
      action: "skipped",
      row: null,
      error: null,
    };
  }

  const subjectKey = {
    leadId: probe.lead_id,
    guestProfileId: probe.guest_profile_id,
  };

  try {
    const { data: existing, error: lookupError } = await sink.findExisting(subjectKey);
    if (lookupError) {
      return { ok: false, action: "skipped", row: probe, error: lookupError.message };
    }

    if (existing) {
      const row = { ...probe, version: existing.version + 1 };
      const { error } = await sink.update(existing.id, row);
      return { ok: error === null, action: "updated", row, error: error?.message ?? null };
    }

    const { error } = await sink.insert(probe);
    return { ok: error === null, action: "created", row: probe, error: error?.message ?? null };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, action: "skipped", row: probe, error: message };
  }
}
