// ─── Kivara Currency Utility ────────────────────────────────────────────
// Multi-currency formatting and conversion for the Kivara luxury travel platform.
// Uses static exchange rates — quotes are locked in at booking time.

export type Currency = "USD" | "EUR" | "GBP" | "ZAR";

export const DEFAULT_CURRENCY: Currency = "USD";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  ZAR: "R",
};

/**
 * Static exchange rates relative to USD.
 * Rates are approximate and updated periodically.
 * For luxury travel, quotes are locked in at booking time so live rates aren't needed.
 */
export const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  ZAR: 18.5,
};

/**
 * Format a monetary amount with the appropriate currency symbol and locale.
 *
 * @example formatCurrency(1500, "USD") // "$1,500.00"
 * @example formatCurrency(1500, "EUR") // "€1,500.00"
 * @example formatCurrency(1500, "ZAR") // "R1,500.00"
 */
export function formatCurrency(amount: number, currency: Currency = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a monetary amount as a compact string (no currency symbol).
 *
 * @example formatAmount(1500) // "1,500"
 * @example formatAmount(1500.50) // "1,500.50"
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Convert an amount from one currency to another using static rates.
 *
 * @example convertCurrency(1000, "USD", "EUR") // 920
 * @example convertCurrency(1000, "EUR", "GBP") // ~858.70
 */
export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  const inUsd = amount / EXCHANGE_RATES[from];
  return Math.round(inUsd * EXCHANGE_RATES[to] * 100) / 100;
}

/**
 * Get the symbol for a currency code.
 *
 * @example getCurrencySymbol("USD") // "$"
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency];
}

/**
 * All supported currencies as an array for iteration.
 */
export const SUPPORTED_CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "ZAR"];
