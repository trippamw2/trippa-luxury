// ─── Kivara Romance Intelligence Agent (Master OS §6) ────────────────────────
// Understands honeymoon psychology, couples, proposals, anniversaries, weddings,
// romantic escapes, privacy, intimacy, celebration and emotional milestones.
// It answers: "What emotional experience is this couple actually looking for?"
// rather than simply "Where do they want to go?", and designs the journey around
// Emotion → Story → Experience → Destination → Journey → Memory.
// Rule-based occasion detection + emotion arcs, with optional LLM narrative.
// ─────────────────────────────────────────────────────────────────────────────

import { callLlmJson } from "./llm";
import { getBrandKnowledge } from "./knowledge";

export type Occasion =
  | "honeymoon"
  | "proposal"
  | "anniversary"
  | "wedding"
  | "romantic-escape"
  | "celebration"
  | "couples"
  | "unknown";

export const OCCASIONS: Occasion[] = [
  "honeymoon",
  "proposal",
  "anniversary",
  "wedding",
  "romantic-escape",
  "celebration",
  "couples",
  "unknown",
];

export interface EmotionStep {
  stage: string;
  intent: string;
  experienceIdea: string;
}

export interface EmotionalProfile {
  occasion: Occasion;
  occasionLabel: string;
  couplePsychology: string;
  privacyNeeds: string;
  intimacyExpectation: string;
  arc: EmotionStep[]; // Emotion → Story → Experience → Destination → Journey → Memory
}

const KEYWORDS: Record<Exclude<Occasion, "couples" | "unknown">, string[]> = {
  honeymoon: ["honeymoon", "honey moon", "first trip together", "newlywed", "just married"],
  proposal: ["propose", "proposal", "will you marry", "engagement"],
  anniversary: ["anniversary", "years together", "milestone"],
  wedding: ["wedding", "elope", "elopement", "destination wedding"],
  "romantic-escape": ["romantic", "escape", "begagnance", "couple getaway", "second honeymoon"],
  celebration: ["birthday", "celebration", "valentine", "special occasion", "surprise"],
};

/**
 * Pure rule-based occasion detection from free text. Unit-testable.
 */
export function detectOccasion(text: string): { occasion: Occasion; confidence: number } {
  const lower = (text || "").toLowerCase();
  let best: { occasion: Occasion; confidence: number } = { occasion: "unknown", confidence: 0 };

  (Object.keys(KEYWORDS) as (keyof typeof KEYWORDS)[]).forEach((occ) => {
    const hits = KEYWORDS[occ].filter((kw) => lower.includes(kw)).length;
    if (hits > 0) {
      const confidence = Math.min(0.95, 0.4 + hits * 0.2);
      if (confidence > best.confidence) best = { occasion: occ, confidence };
    }
  });

  if (best.occasion === "unknown" && /couple|partner|together|we /i.test(lower)) {
    best = { occasion: "couples", confidence: 0.5 };
  }

  if (best.occasion === "unknown") best = { occasion: "unknown", confidence: 0.2 };

  return best;
}

/**
 * Pure: build the EmotionalProfile for a detected occasion. Unit-testable.
 */
export function buildEmotionProfile(occasion: Occasion): EmotionalProfile {
  return profileFor(occasion);
}

function labelFor(occasion: Occasion): string {
  const map: Record<Occasion, string> = {
    honeymoon: "A honeymoon to begin a lifetime of stories",
    proposal: "A proposal — a moment they will never forget",
    anniversary: "An anniversary celebrating years of love",
    wedding: "A destination wedding — a celebration of commitment",
    "romantic-escape": "A romantic escape to reconnect",
    celebration: "A private celebration of a life milestone",
    couples: "A journey for two",
    unknown: "A journey for two",
  };
  return map[occasion];
}

function profileFor(occasion: Occasion): EmotionalProfile {
  let couplePsychology = "A couple seeking a private, intimate and luxurious experience.";
  let privacyNeeds = "High privacy expected.";
  let intimacyExpectation = "Discreet, personalised, emotionally resonant.";
  if (occasion === "honeymoon") {
    couplePsychology = "Newlyweds transitioning from celebration to the beginning of their shared life — seeking romance, closeness and a sense of 'us'.";
    privacyNeeds = "Exceptional privacy; no interruptions.";
    intimacyExpectation = "Romantic, indulgent, and deeply personal.";
  } else if (occasion === "proposal") {
    couplePsychology = "One partner planning a once-in-a-lifetime surprise of commitment; the moment must feel cinematic yet intimate.";
    privacyNeeds = "Total discretion; the proposal itself must be private and perfectly set.";
    intimacyExpectation = "A single, unforgettable emotional peak supported by a private setting.";
  } else if (occasion === "anniversary") {
    couplePsychology = "A couple marking a milestone and reconnecting; nostalgia and celebration blend.";
    privacyNeeds = "Private but celebratory; room to create new memories.";
    intimacyExpectation = "Warm, reflective, celebrated.";
  } else if (occasion === "wedding") {
    couplePsychology = "A couple celebrating commitment with ceremony — intimate and intentional.";
    privacyNeeds = "Curated privacy for the ceremony and celebration.";
    intimacyExpectation = "Meaningful, ceremonial, and beautifully staged.";
  } else if (occasion === "romantic-escape") {
    couplePsychology = "A couple seeking to rekindle closeness away from daily life.";
    privacyNeeds = "Quiet, secluded, restorative.";
    intimacyExpectation = "Relaxed, tender, unhurried.";
  } else if (occasion === "celebration") {
    couplePsychology = "A couple celebrating a personal milestone in style.";
    privacyNeeds = "Private celebration with thoughtful touches.";
    intimacyExpectation = "Delightful, personal, well-orchestrated.";
  }
  return {
    occasion,
    occasionLabel: labelFor(occasion),
    couplePsychology,
    privacyNeeds,
    intimacyExpectation,
    arc: buildEmotionArc(occasion),
  };
}

/**
 * Pure: map an occasion to the Emotion → Story → Experience → Destination →
 * Journey → Memory arc. Unit-testable.
 */
export function buildEmotionArc(occasion: Occasion): EmotionStep[] {
  const base: EmotionStep[] = [
    { stage: "Emotion", intent: "Feel", experienceIdea: "Evoke closeness, awe and belonging", },
    { stage: "Story", intent: "Behold", experienceIdea: "A narrative arc that makes the trip feel like 'ours'", },
    { stage: "Experience", intent: "Live", experienceIdea: "Signature moments tuned to the occasion", },
    { stage: "Destination", intent: "Arrive", experienceIdea: "A setting that matches the emotional tone", },
    { stage: "Journey", intent: "Move", experienceIdea: "Seamless, luxurious movement between moments", },
    { stage: "Memory", intent: "Keep", experienceIdea: "Tangible keepsakes and lasting impressions", },
  ];
  const melody: Partial<Record<Occasion, Partial<EmotionStep>[]>> = {
    honeymoon: [
      { intent: "Begin", experienceIdea: "A slow romantic rhythm with no rushed plans" },
      { intent: "Celebrate", experienceIdea: "A sunset toast, a private beach dinner" },
    ],
    proposal: [
      { intent: "Surprise", experienceIdea: "A cinematic, private proposal staged perfectly" },
      { intent: "Celebrate", experienceIdea: "A celebratory toast and keepsake after 'yes'" },
    ],
    anniversary: [
      { intent: "Reconnect", experienceIdea: "Shared rituals and nostalgic touches" },
      { intent: "Celebrate", experienceIdea: "An intimate milestone dinner" },
    ],
  };
  const overrides = melody[occasion];
  if (overrides) {
    overrides.forEach((o, i) => {
      if (base[i]) Object.assign(base[i], o);
    });
  }
  return base;
}

export class RomanceEngine {
  /**
   * Build an emotional profile. Uses LLM for a personalised narrative when
   * available, otherwise a deterministic profile. Never throws on LLM failure.
   */
  async buildEmotionalProfile(rawInquiry: { text?: string; occasion?: string }): Promise<EmotionalProfile> {
    const text = rawInquiry.text || "";
    const detected = rawInquiry.occasion
      ? { occasion: rawInquiry.occasion as Occasion, confidence: 0.8 }
      : detectOccasion(text);

    const profile = profileFor(detected.occasion);

    // Optional LLM refinement of the psychological narrative.
    if (rawInquiry.occasion || detectOccasion(text).confidence >= 0.4) {
      try {
        const brand = getBrandKnowledge();
        const result = (await callLlmJson<{ couplePsychology?: string; intimacyExpectation?: string }>(
          [
            {
              role: "system",
              content: `You are Kivara's Romance Intelligence agent.${brand?.tagline ? ` Brand: ${brand.tagline}.` : ""} Write warm, discreet, luxurious couple psychology. Output JSON with keys couplePsychology and intimacyExpectation.`,
            },
            {
              role: "user",
              content: `Occasion: ${labelFor(detected.occasion)}. Inquiry: ${text || "(none)"}. Return JSON.`,
            },
          ],
          { temperature: 0.5 }
        )).data;
        if (result?.couplePsychology) profile.couplePsychology = result.couplePsychology;
        if (result?.intimacyExpectation) profile.intimacyExpectation = result.intimacyExpectation;
      } catch {
        // keep deterministic profile
      }
    }

    return profile;
  }
}

export const romanceEngine = new RomanceEngine();
