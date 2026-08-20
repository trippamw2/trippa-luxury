// ─── Kivara Payment Configuration ──────────────────────────────────────
// Shared payment method configuration, tier-based routing, and helpers.

/** Supported payment methods. */
export type PaymentMethod = "paypal" | "wire_transfer";

/**
 * Format a payment method slug into a human-readable label.
 *
 * @example formatPaymentMethod("paypal") // "PayPal"
 * @example formatPaymentMethod("wire_transfer") // "Wire Transfer (SWIFT/IBAN)"
 */
export function formatPaymentMethod(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    paypal: "PayPal",
    wire_transfer: "Wire Transfer (SWIFT/IBAN)",
  };
  return labels[method];
}

/**
 * Amount threshold (USD) above which wire transfer is recommended.
 * Below this threshold, PayPal is the preferred method.
 */
export const PAYPAL_PAYMENT_THRESHOLD_USD = 5000;

interface PaymentTier {
  /** Minimum amount in USD (inclusive). */
  minAmount: number;
  /** Maximum amount in USD (inclusive). `Infinity` for the top tier. */
  maxAmount: number;
  /** The payment method recommended for this tier. */
  recommended: PaymentMethod;
  /** All payment methods allowed for this tier. */
  allowed: PaymentMethod[];
}

/**
 * Payment tiers define which methods are available and recommended
 * based on the total booking amount in USD.
 *
 * - Up to $4,999: PayPal recommended (card/PayPal preferred for speed)
 * - $5,000+: Wire Transfer recommended (lower processing fees at scale)
 *
 * Both methods are always available — the tier is advisory, not enforced.
 */
export const PAYMENT_TIERS: PaymentTier[] = [
  {
    minAmount: 0,
    maxAmount: 4999,
    recommended: "paypal",
    allowed: ["paypal", "wire_transfer"],
  },
  {
    minAmount: 5000,
    maxAmount: Infinity,
    recommended: "wire_transfer",
    allowed: ["paypal", "wire_transfer"],
  },
];

/**
 * Get the recommended payment method for a given amount in USD.
 *
 * @param amountUsd - The total booking amount in USD
 * @returns The recommended payment method
 *
 * @example getRecommendedMethod(2500) // "paypal"
 * @example getRecommendedMethod(12000) // "wire_transfer"
 */
export function getRecommendedMethod(amountUsd: number): PaymentMethod {
  for (const tier of PAYMENT_TIERS) {
    if (amountUsd >= tier.minAmount && amountUsd <= tier.maxAmount) {
      return tier.recommended;
    }
  }
  // Fallback to the last tier
  return PAYMENT_TIERS[PAYMENT_TIERS.length - 1].recommended;
}

/**
 * Get all allowed payment methods for a given amount in USD.
 *
 * @param amountUsd - The total booking amount in USD
 * @returns Array of allowed payment methods
 *
 * @example getAllowedMethods(2500) // ["paypal", "wire_transfer"]
 * @example getAllowedMethods(12000) // ["paypal", "wire_transfer"]
 */
export function getAllowedMethods(amountUsd: number): PaymentMethod[] {
  for (const tier of PAYMENT_TIERS) {
    if (amountUsd >= tier.minAmount && amountUsd <= tier.maxAmount) {
      return tier.allowed;
    }
  }
  return PAYMENT_TIERS[PAYMENT_TIERS.length - 1].allowed;
}
