// ─── KIVARA Brand Voice System ───────────────────────────────────────────
// Central module for all brand-aligned communications.
// Every guest-facing output should import from here.

export { transform, luxury, upgradeVocabulary, sanitiseForbidden } from "./transform";
export {
  PREFERRED_VOCABULARY,
  FORBIDDEN_WORDS,
  PHRASE_REPLACEMENTS,
  DEPARTMENT_VOICES,
  type VoiceConfig,
} from "./rules";
export {
  journeyIntro,
  journeyOverview,
  accommodationDescription,
  activityDescription,
  romanticHighlight,
  inquiryReceived,
  curationInProgress,
  paymentRequest,
  paymentConfirmed,
  paymentReminder,
  preTrip30,
  preTrip14,
  preTrip7,
  preTrip1,
  dayOfTravel,
  postTripDay1,
  postTripDay7,
  postTripDay30,
  signature,
  salutation,
} from "./prose";
