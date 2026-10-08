// Single source of truth for the cookie-consent banner's storage key and the
// event that announces a change. The banner (CookieConsent) writes; anything
// that gates on consent (ConsentAnalytics) reads and subscribes. Keeping the
// key here stops the writer and reader from drifting apart silently.

export const CONSENT_STORAGE_KEY = "kivara-cookie-consent";
export const CONSENT_CHANGE_EVENT = "kivara:consent-change";

export type CookieConsentChoice = "all" | "essential";

export function readCookieConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  return value === "all" || value === "essential" ? value : null;
}

export function writeCookieConsent(choice: CookieConsentChoice): void {
  window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/** Subscribe to consent changes. Returns the unsubscribe function. */
export function onCookieConsentChange(handler: () => void): () => void {
  window.addEventListener(CONSENT_CHANGE_EVENT, handler);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handler);
}
