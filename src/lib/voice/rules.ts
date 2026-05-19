// ─── KIVARA Brand Language Rules ─────────────────────────────────────────
// Central vocabulary, tone rules, and department configurations.
// Every guest-facing output passes through this system.
//
// BRAND POSITIONING: Romance is the primary pillar. Nature and Wellness support it.
// Core proposition: "Luxury journeys designed for deep connection."
// Voice should feel like a luxury love story — sensual, elegant, cinematic, emotionally intelligent.

/** Luxury-appropriate vocabulary — prefer these words */
export const PREFERRED_VOCABULARY: Record<string, string[]> = {
  accommodation: ["residence", "retreat", "sanctuary", "lodge", "camp", "villa", "haven", "hideaway"],
  journey: ["journey", "escape", "sojourn", "expedition", "pilgrimage", "odyssey", "romance"],
  experience: ["experience", "encounter", "immersion", "discovery", "exploration", "intimate moment"],
  service: ["attentive", "intuitive", "seamless", "thoughtful", "discerning", "devoted"],
  atmosphere: ["serene", "tranquil", "intimate", "cinematic", "spellbinding", "sensual", "dreamlike"],
  quality: ["exceptional", "remarkable", "extraordinary", "unforgettable", "timeless", "sublime"],
  nature: ["wilderness", "bush", "shore", "coast", "highlands", "plains", "archipelago", "sanctuary"],
  romance: ["intimacy", "connection", "togetherness", "devotion", "tenderness", "passion", "desire"],
  time: ["moment", "memory", "chapter", "page", "story", "eternity"],
  food: ["cuisine", "dining", "gastronomy", "fare", "sensory journey"],
  sensory: ["golden light", "warm breeze", "candlelit", "silhouette", "whisper", "soft glow"],
};

/** Words/phrases to NEVER use in guest-facing output */
export const FORBIDDEN_WORDS: string[] = [
  // Transactional / discount
  "cheap",
  "best deal",
  "bargain",
  "discount",
  "budget",
  "low-cost",
  "sell",
  "sales pitch",
  "book now",
  "act now",
  "limited offer",
  "hurry",
  "don't miss out",
  "package",
  "all-inclusive",
  // Overused hype
  "exciting",
  "amazing",
  "awesome",
  "incredible",
  "fantastic",
  "wonderful",
  "great",
  "cool",
  "super",
  "must-see",
  "can't miss",
  "once in a lifetime",
  "breathtaking",
  "stunning",
  "magical",
  "unique",
  "authentic",
  // Generic hospitality
  "check in",
  "check out",
  "hotel",
  "room",
  "tourist",
  "touristy",
  "crowded",
  // Transactional mindset
  "booking",
  "booked",
  "accommodation",
];

/** Common generic phrases → luxury KIVARA equivalents */
export const PHRASE_REPLACEMENTS: [RegExp, string][] = [
  // ── Romance-first positioning ──────────────────────────────────
  [/your journey/gi, "your love story"],
  [/this journey/gi, "this romance"],
  [/romantic getaway/gi, "an intimate escape for two"],
  [/honeymoon/gi, "the beginning of your forever"],
  [/anniversary trip/gi, "a celebration of your shared story"],
  [/proposal/gi, "the moment you ask forever"],
  [/couples retreat/gi, "a sanctuary for your connection"],

  // ── Confirmations (warm, not transactional) ────────────────────
  [/your booking has been confirmed/gi, "your journey has been thoughtfully reserved and confirmed"],
  [/we have booked/gi, "we have carefully arranged"],
  [/payment received/gi, "your payment has been gracefully received"],
  [/booking confirmed/gi, "journey confirmed"],
  [/booking reference/gi, "your personal reference"],
  [/reservation/gi, "journey arrangement"],

  // ── Time references (emotional, not countdown) ─────────────────
  [/coming up/gi, "approaching"],
  [/coming soon/gi, "on the horizon"],
  [/countdown/gi, "anticipation builds"],
  [/days to go/gi, "days remain until your journey"],
  [/X days left/gi, "the wait grows sweeter"],

  // ── Pricing (dignified, not transactional) ─────────────────────
  [/cost/gi, "investment"],
  [/price/gi, "value"],
  [/you pay/gi, "your investment"],
  [/total cost/gi, "total investment"],
  [/payment due/gi, "payment respectfully requested"],
  [/deposit/gi, "reservation commitment"],
  [/balance/gi, "remaining investment"],
  [/invoice/gi, "journey summary"],

  // ── Activities → romantic experiences ──────────────────────────
  [/fun activities/gi, "curated experiences"],
  [/exciting activities/gi, "carefully selected encounters"],
  [/things to do/gi, "experiences to discover"],
  [/attractions/gi, "points of wonder"],
  [/activities/gi, "romantic encounters"],
  [/game drive/gi, "intimate safari journey"],
  [/safari/gi, "wilderness romance"],

  // ── Generic descriptions → elevated ────────────────────────────
  [/beautiful/gi, "exceptional"],
  [/nice/gi, "refined"],
  [/good/gi, "thoughtful"],
  [/big/gi, "grand"],
  [/nice view/gi, "panoramic vista"],
  [/enjoy/gi, "savour"],
  [/have fun/gi, "immerse yourself"],
  [/relax/gi, "surrender to stillness"],
  [/relaxing/gi, "restorative"],
  [/peaceful/gi, "serene"],
  [/private/gi, "intimate"],

  // ── Hospitality terms → romance sanctuary language ─────────────
  [/guest/gi, "guest"],
  [/tour/gi, "journey"],
  [/trip/gi, "journey"],
  [/vacation/gi, "escape"],
  [/holiday/gi, "sojourn"],
  [/check in/gi, "arrival"],
  [/check out/gi, "departure"],
  [/room/gi, "suite"],
  [/hotel/gi, "residence"],
  [/restaurant/gi, "dining room"],
  [/lobby/gi, "arrival hall"],
  [/conference room/gi, "private dining salon"],

  // ── Closings (warm, lingering) ─────────────────────────────────
  [/have a nice day/gi, "until we meet again"],
  [/thank you for your inquiry/gi, "we are honoured by your interest"],
  [/we hope to see you again/gi, "we look forward to welcoming you once more"],
  [/goodbye/gi, "until your next chapter with us"],
  [/take care/gi, "may the memories linger"],
];

/**
 * Department-specific voice configuration.
 * Each department adjusts tone, formality, and emphasis.
 */
export interface VoiceConfig {
  formality: "high" | "moderate" | "warm";
  emphasis: string[];
  avoid: string[];
  salutation: string;
  closing: string;
  signatureName: string;
}

export const DEPARTMENT_VOICES: Record<string, VoiceConfig> = {
  concierge: {
    formality: "warm",
    emphasis: ["reassurance", "anticipation", "personal attention", "intimacy"],
    avoid: ["corporate", "robotic", "transactional"],
    salutation: "Dear",
    closing: "With warmest regards",
    signatureName: "Your Kivara Concierge",
  },
  curatorial: {
    formality: "warm",
    emphasis: ["exclusivity", "craftsmanship", "emotional storytelling", "personal curation"],
    avoid: ["pushy", "urgent", "sales-like"],
    salutation: "Dear",
    closing: "Yours in discovery",
    signatureName: "The Kivara Curatorial Team",
  },
  document: {
    formality: "high",
    emphasis: ["elegance", "precision", "editorial quality", "romantic narrative"],
    avoid: ["casual", "abbreviated"],
    salutation: "",
    closing: "With warmest regards",
    signatureName: "Kivara Luxury Travel",
  },
  operations: {
    formality: "moderate",
    emphasis: ["clarity", "efficiency", "professionalism", "reassurance"],
    avoid: ["slang", "over-familiarity"],
    salutation: "Dear",
    closing: "Best regards",
    signatureName: "Kivara Operations",
  },
  followup: {
    formality: "warm",
    emphasis: ["gratitude", "nostalgia", "community", "lingering memories"],
    avoid: ["sales", "robotic"],
    salutation: "Dear",
    closing: "With gratitude",
    signatureName: "Your Kivara Team",
  },
};
