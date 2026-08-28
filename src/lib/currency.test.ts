import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatAmount,
  convertCurrency,
  getCurrencySymbol,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  CURRENCY_SYMBOLS,
  type Currency,
} from "@/lib/currency";

describe("formatCurrency", () => {
  it("defaults to USD", () => {
    expect(DEFAULT_CURRENCY).toBe("USD");
    expect(formatCurrency(1500)).toBe("$1,500");
  });

  it("formats USD with a dollar sign and thousands separators", () => {
    expect(formatCurrency(1500, "USD")).toBe("$1,500");
    expect(formatCurrency(1234567, "USD")).toBe("$1,234,567");
  });

  it("formats EUR with a euro sign", () => {
    const out = formatCurrency(1500, "EUR");
    expect(out).toContain("€");
    expect(out).toContain("1,500");
  });

  it("formats GBP with a pound sign", () => {
    const out = formatCurrency(1500, "GBP");
    expect(out).toContain("£");
    expect(out).toContain("1,500");
  });

  it("formats ZAR with a rand sign", () => {
    const out = formatCurrency(1500, "ZAR");
    expect(out).toContain("R");
    expect(out).toContain("1,500");
  });

  it("handles decimal amounts without forcing trailing zeros", () => {
    // minimumFractionDigits:0, maximumFractionDigits:2
    expect(formatCurrency(1500.5, "USD")).toBe("$1,500.5");
    expect(formatCurrency(1500.55, "USD")).toBe("$1,500.55");
  });
});

describe("formatAmount", () => {
  it("formats an integer with thousands separators and no symbol", () => {
    expect(formatAmount(1500)).toBe("1,500");
    expect(formatAmount(1234567)).toBe("1,234,567");
  });

  it("formats decimals with up to two places", () => {
    expect(formatAmount(1500.5)).toBe("1,500.5");
    expect(formatAmount(1500.55)).toBe("1,500.55");
  });
});

describe("convertCurrency", () => {
  it("returns the same amount when converting to the same currency", () => {
    expect(convertCurrency(1000, "USD", "USD")).toBe(1000);
    expect(convertCurrency(1000, "EUR", "EUR")).toBe(1000);
  });

  it("converts USD to EUR using the static rate", () => {
    // USD:1, EUR:0.92 → 1000 * 0.92 = 920
    expect(convertCurrency(1000, "USD", "EUR")).toBe(920);
  });

  it("converts USD to GBP using the static rate", () => {
    // USD:1, GBP:0.79 → 1000 * 0.79 = 790
    expect(convertCurrency(1000, "USD", "GBP")).toBe(790);
  });

  it("converts USD to ZAR using the static rate", () => {
    // USD:1, ZAR:18.5 → 1000 * 18.5 = 18500
    expect(convertCurrency(1000, "USD", "ZAR")).toBe(18500);
  });

  it("converts between two non-USD currencies", () => {
    // 100 EUR → USD = 100 / 0.92 = 108.6956... → * 0.79 GBP = 85.8695... ≈ 85.87
    expect(convertCurrency(100, "EUR", "GBP")).toBeCloseTo(85.87, 2);
  });
});

describe("getCurrencySymbol", () => {
  it("returns the correct symbol for each supported currency", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("EUR")).toBe("€");
    expect(getCurrencySymbol("GBP")).toBe("£");
    expect(getCurrencySymbol("ZAR")).toBe("R");
  });
});

describe("currency constants", () => {
  it("exposes all supported currencies", () => {
    expect(SUPPORTED_CURRENCIES).toEqual(["USD", "EUR", "GBP", "ZAR"]);
  });

  it("maps every currency to a symbol", () => {
    expect(Object.keys(CURRENCY_SYMBOLS).sort()).toEqual(["EUR", "GBP", "USD", "ZAR"]);
    for (const c of SUPPORTED_CURRENCIES) {
      expect(CURRENCY_SYMBOLS[c as Currency]).toBeTruthy();
    }
  });
});
