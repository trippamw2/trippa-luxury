// ─── Kivara Quality Control Gate ───────────────────────────────────────────
// Validates a generated QuoteData / CuratedJourney before it reaches a guest.
// The QC gate is the "no sends a broken or embarrassing proposal" guardrail.
// It returns a deterministic verdict the pipeline can act on (pass, warn, fail).

import type { CuratedJourney, JourneyPricing } from "./types";

export type QcSeverity = "pass" | "warn" | "fail";

export interface QcIssue {
  severity: Exclude<QcSeverity, "pass">;
  code: string;
  message: string;
}

export interface QcVerdict {
  ok: boolean; // false if any "fail" severity issue exists
  severity: QcSeverity;
  issues: QcIssue[];
}

const EPSILON = 0.5; // $ tolerance for arithmetic rounding
const DEPOSIT_PERCENT = 30;
const MAX_TAX_PERCENT = 0.15;

function addIssue(
  issues: QcIssue[],
  severity: Exclude<QcSeverity, "pass">,
  code: string,
  message: string
): void {
  issues.push({ severity, code, message });
}

function worstSeverity(issues: QcIssue[]): QcSeverity {
  if (issues.some((i) => i.severity === "fail")) return "fail";
  if (issues.some((i) => i.severity === "warn")) return "warn";
  return "pass";
}

/** Check the derived deposit figure against the canonical deposit percentage. */
function checkDeposit(verdict: { issues: QcIssue[] }, journey: CuratedJourney, depositRequired: number): void {
  const expected = Math.round(journey.pricing.total * (DEPOSIT_PERCENT / 100));
  if (Math.abs(expected - depositRequired) > EPSILON) {
    addIssue(
      verdict.issues,
      "fail",
      "DEPOSIT_MISMATCH",
      `Deposit $${depositRequired} does not match ${DEPOSIT_PERCENT}% of total ($${expected}).`
    );
  }
}

/** Verify accommodation line items sum to the accommodation subtotal within rounding tolerance. */
function checkAccommodationSum(verdict: { issues: QcIssue[] }, pricing: JourneyPricing): void {
  const transferCost = pricing.transfers.reduce((sum, t) => sum + t.cost, 0);
  const accommodationSubtotal = pricing.subtotal - transferCost;
  const sumLineItems = pricing.accommodation.reduce((sum, a) => sum + a.subtotal, 0);
  if (Math.abs(sumLineItems - accommodationSubtotal) > EPSILON) {
    addIssue(
      verdict.issues,
      "fail",
      "ACCOMMODATION_SUM_MISMATCH",
      `Accommodation line items sum to $${sumLineItems} but subtotal implies $${accommodationSubtotal} (after excluding $${transferCost} transfers).`
    );
  }
  for (const item of pricing.accommodation) {
    const expected = Math.round(item.ratePerNight * item.nights);
    if (Math.abs(expected - item.subtotal) > EPSILON) {
      addIssue(
        verdict.issues,
        "warn",
        "ACCOMMODATION_ITEM_SUBTOTAL",
        `"${item.label}": $${item.ratePerNight}/night × ${item.nights} nights = $${expected}, but subtotal is $${item.subtotal}.`
      );
    }
  }
}

function checkPricingIntegrity(verdict: { issues: QcIssue[] }, journey: CuratedJourney): void {
  const p = journey.pricing;
  if (p.total <= 0) {
    addIssue(verdict.issues, "fail", "NONPOSITIVE_TOTAL", `Journey total ($${p.total}) is not positive.`);
  }
  if (p.subtotal <= 0) {
    addIssue(verdict.issues, "warn", "NONPOSITIVE_SUBTOTAL", `Journey subtotal ($${p.subtotal}) is not positive.`);
  }
  if (p.taxes < 0) {
    addIssue(verdict.issues, "fail", "NEGATIVE_TAXES", `Taxes ($${p.taxes}) must not be negative.`);
  }
  if (p.taxes > p.subtotal * MAX_TAX_PERCENT) {
    addIssue(
      verdict.issues,
      "warn",
      "TAXES_ABOVE_EXPECTED",
      `Taxes ($${p.taxes}) exceed ${Math.round(MAX_TAX_PERCENT * 100)}% of subtotal ($${Math.round(p.subtotal * MAX_TAX_PERCENT)}).`
    );
  }
  const sumOfParts = p.subtotal + p.taxes;
  if (Math.abs(sumOfParts - p.total) > EPSILON) {
    addIssue(
      verdict.issues,
      "fail",
      "TOTAL_MISMATCH",
      `Subtotal + taxes ($${sumOfParts}) does not equal total ($${p.total}).`
    );
  }
  if (p.accommodation.length === 0) {
    addIssue(verdict.issues, "fail", "NO_ACCOMMODATION", "Journey has no accommodation line items.");
  }
  for (const item of p.accommodation) {
    if (item.nights <= 0) {
      addIssue(verdict.issues, "fail", "INVALID_NIGHTS", `"${item.label}" has ${item.nights} nights (must be > 0).`);
    }
    if (item.ratePerNight <= 0) {
      addIssue(verdict.issues, "fail", "INVALID_RATE", `"${item.label}" has a non-positive rate-per-night ($${item.ratePerNight}).`);
    }
    if (item.ratePerNight > 5000) {
      addIssue(verdict.issues, "warn", "RATE_ABOVE_EXPECTED", `"${item.label}" rate-per-night ($${item.ratePerNight}) is unusually high — verify it is intentional.`);
    }
  }
}

function checkJourneyIntegrity(verdict: { issues: QcIssue[] }, journey: CuratedJourney): void {
  if (journey.duration <= 0) {
    addIssue(verdict.issues, "fail", "INVALID_DURATION", `Journey duration (${journey.duration} nights) must be > 0.`);
  }
  if (journey.destinations.length === 0) {
    addIssue(verdict.issues, "fail", "NO_DESTINATIONS", "Journey has no destinations.");
  }
  if (journey.itinerary.length === 0) {
    addIssue(verdict.issues, "fail", "NO_ITINERARY", "Journey has no itinerary days.");
  }
  const sumNights = journey.itinerary.reduce((sum, d) => sum + (d.accommodation ? 1 : 0), 0);
  if (sumNights > 0 && sumNights !== journey.duration) {
    addIssue(
      verdict.issues,
      "warn",
      "ITINERARY_NIGHTS_MISMATCH",
      `Itinerary covers ${sumNights} nights/relevant days but duration is ${journey.duration}.`
    );
  }
  if (!journey.title || journey.title.trim().length === 0) {
    addIssue(verdict.issues, "fail", "NO_TITLE", "Journey has no title.");
  }
  if (journey.highlights.length === 0) {
    addIssue(verdict.issues, "warn", "NO_HIGHLIGHTS", "Journey has no highlights — the proposal will feel thin.");
  }
  const guestName = journey.guestProfile?.name;
  if (!guestName || guestName.trim().length === 0) {
    addIssue(verdict.issues, "warn", "NO_GUEST_NAME", "Guest name is missing — the personalisation header will be blank.");
  }
}

/**
 * Run the full quality-control pass over a generated quote.
 * Returns a verdict; the caller decides whether to block, warn, or proceed.
 */
export function runQualityGate(
  journey: CuratedJourney,
  depositRequired?: number
): QcVerdict {
  const issues: QcIssue[] = [];
  const ctx = { issues };

  checkPricingIntegrity(ctx, journey);
  checkJourneyIntegrity(ctx, journey);
  if (journey.pricing.accommodation.length > 0) {
    checkAccommodationSum(ctx, journey.pricing);
  }
  if (typeof depositRequired === "number") {
    checkDeposit(ctx, journey, depositRequired);
  }

  const severity = worstSeverity(issues);
  return { ok: severity !== "fail", severity, issues };
}

export const QC_DEPOSIT_PERCENT = DEPOSIT_PERCENT;
