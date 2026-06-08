// ─── KIVARA Brand-aligned Prose Compositions ─────────────────────────────
// Reusable, luxury-voice text components for all guest-facing output.
// Every paragraph is written to the KIVARA brand standard.
//
// TONE: A luxury love story: warm, intimate, emotionally intelligent.
// Every word should make the guest feel seen, desired, and deeply cared for.

import { DEPARTMENT_VOICES, type VoiceConfig } from "./rules";

// ─── Helpers ─────────────────────────────────────────────────────────

function config(dept: string): VoiceConfig {
  return DEPARTMENT_VOICES[dept] || DEPARTMENT_VOICES.concierge;
}

// ─── Journey / Experience Descriptions ───────────────────────────────

/** Opening line for a curated journey proposal: emotional, intimate */
export function journeyIntro(guestName: string, destination: string): string {
  return `It is our privilege to present this personally curated ${destination} romance for you, ${guestName}. Every element has been chosen with your love story in mind: from the sanctuaries that will hold your most intimate moments to the landscapes waiting to witness your connection unfold.`;
}

/** Concise journey overview: sensory and romantic */
export function journeyOverview(destinations: string[], duration: number): string {
  const destList = destinations.join(" and ");
  return `This ${duration}-night romance weaves together ${destList}: an immersion into worlds where golden light meets turquoise waters, where the rhythm of the bush yields to the gentle whisper of the shore. Each day unfolds at its own pace, guided by your desires and the quiet devotion of your concierge.`;
}

/** Description for a single property / accommodation: intimate sanctuary language */
export function accommodationDescription(propertyName: string, location: string, ambiance: string): string {
  return `${propertyName} rests in the heart of ${location}, offering ${ambiance}. Here, time slows to the rhythm of your heart. Every detail has been designed for intimacy: for the quiet moments that become your most treasured memories.`;
}

/** Activity description with romantic sensory focus */
export function activityDescription(title: string, sensoryNote: string): string {
  return `${title}: ${sensoryNote}. A moment suspended in time, crafted to linger in your memory long after you return home.`;
}

/** Romantic journey highlight: emotional connection focus */
export function romanticHighlight(coupleNames: string): string {
  return `For ${coupleNames}, this journey is more than an escape: it is a chapter in your love story. Quiet mornings wrapped in golden light, evenings surrendered to candlelit stillness, and a depth of connection that only arises when two souls pause to truly see each other.`;
}

// ─── Welcome / Acknowledgement ───────────────────────────────────────

/** Warm welcome for new inquiry: honoured, personal */
export function inquiryReceived(guestName: string): string {
  return `Dear ${guestName}, thank you for entrusting Kivara with your romantic vision. Your inquiry has arrived, and already our concierge is beginning to imagine the journey that awaits you. You can expect a personally curated response within 24 hours: a proposal designed not just for your preferences, but for the story you wish to share together.`;
}

/** Confirmation that journey is being curated: anticipatory, warm */
export function curationInProgress(guestName: string): string {
  return `Dear ${guestName}, your desires are being held with care. Our curators are selecting the sanctuaries, the encounters, and the quiet rhythms that will define your time together. We will return to you with a proposal that feels as though it was written for you alone: because it was.`;
}

// ─── Payment / Financial ─────────────────────────────────────────────

/** Dignified payment request: gentle, not transactional */
export function paymentRequest(guestName: string, amount: string, bookingRef: string, type: string): string {
  const label = type === "deposit"
    ? "reservation commitment to secure your romance"
    : type === "balance"
    ? "remaining investment"
    : "total investment";
  return `Dear ${guestName}, your romance proposal for ${bookingRef} remains gracefully reserved pending a ${label} of ${amount}. Once received, we will finalise every detail of your love story with the attention it deserves.`;
}

/** Payment confirmation with warmth and gratitude */
export function paymentConfirmed(guestName: string, amount: string, bookingRef: string): string {
  return `Dear ${guestName}, your investment of ${amount} for ${bookingRef} has been received with gratitude. Your journey draws closer. Our team is curating every detail: from the moment you arrive to the memory that will linger long after you depart.`;
}

/** Gentle payment reminder: never pushy */
export function paymentReminder(guestName: string, daysRemaining: number): string {
  if (daysRemaining <= 3) {
    return `Dear ${guestName}, this is a gentle whisper that your romance awaits confirmation. We would be honoured to welcome you.`;
  }
  return `Dear ${guestName}, we wished to gently remind you that your journey proposal remains reserved, waiting for your beautiful yes. Should you have any questions or wishes, your concierge is here, always.`;
}

// ─── Pre-Trip / Reminders ────────────────────────────────────────────

/** 30-day pre-trip: anticipation building, poetic */
export function preTrip30(guestName: string, destination: string): string {
  return `Dear ${guestName}, your ${destination} romance is approaching. In the coming weeks, the anticipation will deepen like a sunset: slow, beautiful, inevitable. Every detail of your itinerary is being refined with love. Please ensure your travel documents are in order; your concierge is here for any questions that arise.`;
}

/** 14-day pre-trip: preparation with warmth */
export function preTrip14(guestName: string, destination: string): string {
  return `Dear ${guestName}, two weeks remain until your ${destination} escape. Your itinerary is taking its final shape: every transfer, every reservation, every whispered promise of an experience to come. Allow the anticipation to build. Your final journey awaits.`;
}

/** 7-day pre-trip: final details, serene confidence */
export function preTrip7(guestName: string, destination: string): string {
  return `Dear ${guestName}, one week from today you arrive in ${destination}. Your final itinerary is ready: every moment arranged, every detail considered. All that remains is for you to arrive, breathe, and let Africa work its quiet, transformative magic upon your hearts.`;
}

/** 1-day pre-trip: eve of departure, emotional */
export function preTrip1(guestName: string, destination: string): string {
  return `Dear ${guestName}, tomorrow your love story continues in ${destination}. Everything has been arranged with care beyond measure. Your concierge is on standby throughout your travels. Simply arrive, surrender, and let the journey unfold.`;
}

/** Day of travel welcome: warm embrace */
export function dayOfTravel(guestName: string, destination: string): string {
  return `Dear ${guestName}, welcome to ${destination}. Your love story begins here: in the golden light, the warm breeze, the quiet promise of days yet to unfold. Every detail has been thoughtfully arranged. Your personal concierge is just a heartbeat away.`;
}

// ─── Post-Trip / Follow-Ups ──────────────────────────────────────────

/** Day 1 check-in: nostalgic, inviting reflection */
export function postTripDay1(guestName: string, destination: string): string {
  return `Dear ${guestName}, welcome home. We hope the echo of your ${destination} romance lingers beautifully in your heart. Your concierge would treasure hearing about the moments that moved you: the sunset that stole your breath, the silence that spoke. Simply reply to this note. We are always here.`;
}

/** Day 7 NPS / review request: gracious, not transactional */
export function postTripDay7(guestName: string, destination: string): string {
  return `Dear ${guestName}, a week has passed since your return from ${destination}. We would be honoured if you would share a reflection on your time away. Your words help us refine every detail for future romances: and inspire others to discover Africa's capacity for love.`;
}

/** Day 30 referral request: warm, appreciative */
export function postTripDay30(guestName: string, destination: string): string {
  return `Dear ${guestName}, a month has drifted by since your ${destination} sojourn. We hope the memories are settling into your everyday life like golden dust. If you know someone who would treasure a Kivara romance, we would be honoured by an introduction. There is no compliment more profound.`;
}

// ─── Signatures ──────────────────────────────────────────────────────

export function signature(department: string = "concierge"): string {
  const cfg = config(department);
  return `${cfg.closing},<br><strong style="color: #C9A96E;">${cfg.signatureName}</strong>`;
}

export function salutation(guestName: string, department: string = "concierge"): string {
  const cfg = config(department);
  return `${cfg.salutation} ${guestName},`;
}
