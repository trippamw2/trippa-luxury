// ─── Kivara AI Guest Profiler ──────────────────────────────────────────
// Extracts structured guest preferences from raw inquiry text.
// Uses LLM (via OpenRouter) for deep analysis, with rule-based fallback.

import type { GuestProfile } from "./types";
import { callLlmJson, type LlmMessage } from "./llm";

export interface RawInquiry {
  fullName: string;
  email: string;
  phone?: string;
  destination?: string;
  preferredDates?: string;
  guests?: number;
  message: string;
}

export interface ProfiledGuest extends GuestProfile {
  source: "website" | "whatsapp" | "email" | "referral";
  inquiryId?: string;
  leadScore: number;
  leadTier: "hot" | "warm" | "cold";
  extractedPreferences: string[];
  extractedBudget?: string;
  extractedOccasion?: string;
  extractedDestinations: string[];
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
    };

    guest.leadScore = this.calculateLeadScore(raw, guest, text);
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

  private calculateLeadScore(raw: RawInquiry, guest: ProfiledGuest, text: string): number {
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
1. **Lake Malawi** : freshwater archipelago, barefoot luxury, intimate beach properties (Kaya Mawa, Pumulani, Blue Zebra, Makokola Retreat)
2. **South Luangwa** : Zambia's premier walking safari destination, wildlife, luxury camps (Chinzombo, Puku Ridge, Shawa, Luangwa River Camp)
3. **Zanzibar** : Spice Island, white sand beaches, Swahili culture (Xanadu Villas, Kilindi, Baraza, The Palms, The Residence)

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
          travelStyle: validStyles.includes(data.travelStyle as any)
            ? (data.travelStyle as GuestProfile["preferences"]["travelStyle"])
            : "mixed",
          accommodationStyle: validAccommodation.includes(data.accommodationStyle as any)
            ? (data.accommodationStyle as GuestProfile["preferences"]["accommodationStyle"])
            : "luxury-resort",
          activityLevel: validActivity.includes(data.activityLevel as any)
            ? (data.activityLevel as GuestProfile["preferences"]["activityLevel"])
            : "moderate",
          budgetRange: validBudget.includes(data.budgetRange as any)
            ? (data.budgetRange as GuestProfile["preferences"]["budgetRange"])
            : "premium",
          interests: Array.isArray(data.interests) ? data.interests : [],
        },
        source: "website",
        inquiryId: undefined,
        leadScore: Math.min(100, Math.max(0, typeof data.leadScore === "number" ? data.leadScore : 0)),
        leadTier: validTiers.includes(data.leadTier as any)
          ? (data.leadTier as "hot" | "warm" | "cold")
          : "cold",
        extractedPreferences: Array.isArray(data.extractedPreferences) ? data.extractedPreferences : [],
        extractedBudget: typeof data.extractedBudget === "string" ? data.extractedBudget : undefined,
        extractedOccasion: typeof data.extractedOccasion === "string" ? data.extractedOccasion : data.specialOccasion || undefined,
        extractedDestinations: Array.isArray(data.destinations) && data.destinations.length > 0
          ? data.destinations
          : [raw.destination || "lake-malawi"],
      };
    } catch (err) {
      // LLM failed : fall back to rule-based profiling
      console.warn("LLM profiling failed, using rule-based fallback:", err instanceof Error ? err.message : String(err));
      return this.profile(raw);
    }
  }
}

export const guestProfiler = new GuestProfiler();
