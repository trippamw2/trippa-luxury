/**
 * The single source of truth for what a booking is owed.
 *
 * The PayPal create and execute routes must agree on this arithmetic. When they
 * disagree (or when a route recomputes it from client input), a guest can pay a
 * token amount and have a much larger booking marked as paid. So both routes
 * derive the figure here, and `execute` re-checks the captured total against
 * the same function.
 */

export const PAYMENT_TYPES = ["deposit", "balance", "full"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export function isPaymentType(value: unknown): value is PaymentType {
  return typeof value === "string" && (PAYMENT_TYPES as readonly string[]).includes(value);
}

/** The booking fields needed to price a payment. */
export interface PayableBooking {
  total_amount?: number | null;
  deposit_amount?: number | null;
  currency?: string | null;
}

export interface PayableAmount {
  /** Amount due, in the booking's own currency. */
  amount: number;
  currency: string;
  /** Booking status to record once this payment settles. */
  nextStatus: string;
  /** Balance still outstanding after this payment. */
  remainingBalance: number;
}

/** Deposit taken as a share of the total when no deposit has been agreed. */
export const DEFAULT_DEPOSIT_RATE = 0.3;

function toAmount(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Amount due for `type` on this booking.
 *
 * Returns `null` when the booking cannot be priced honestly (missing total, or
 * a deposit that exceeds the total). Callers must treat `null` as "refuse",
 * never as zero.
 */
export function derivePayableAmount(
  booking: PayableBooking,
  type: PaymentType
): PayableAmount | null {
  const total = toAmount(booking.total_amount);
  if (total <= 0) return null;

  const deposit = toAmount(booking.deposit_amount);
  const currency = booking.currency || "USD";

  if (deposit > total) return null;

  if (type === "deposit") {
    const amount = deposit > 0 ? deposit : total * DEFAULT_DEPOSIT_RATE;
    return {
      amount,
      currency,
      nextStatus: "deposit_paid",
      remainingBalance: roundMoney(total - amount),
    };
  }

  if (type === "balance") {
    const amount = total - deposit;
    // A balance payment of zero is never legitimate: it would confirm a booking
    // without transferring any funds.
    if (amount <= 0) return null;
    return { amount, currency, nextStatus: "paid", remainingBalance: 0 };
  }

  return { amount: total, currency, nextStatus: "paid", remainingBalance: 0 };
}

/** Round to cents so repeated float arithmetic cannot drift. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Compare monetary amounts in minor units, so 0.1 + 0.2 style drift is not
 * mistaken for a mismatch (or, worse, a match).
 */
export function amountsEqual(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.round(a * 100) === Math.round(b * 100);
}

/** True when the amount is safely below the ceiling, for PayPal order creation. */
export function isPricedWithinLimit(amount: number): boolean {
  // PayPal rejects absurd or non-positive orders; catch it before the API call.
  return Number.isFinite(amount) && amount > 0 && amount <= 1_000_000;
}
