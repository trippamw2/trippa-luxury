import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "platform_settings") {
        return {
          select: () => Promise.resolve({ data: [], error: null }),
          upsert: () => Promise.resolve({ data: null, error: null }),
        };
      }
      return {};
    },
  }),
}));

describe("fx-rates", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("falls back to static rates when fetch fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network"));
    const { getUsdRates, resetFxCache } = await import("@/lib/fx-rates");
    resetFxCache();
    const rates = await getUsdRates();
    expect(rates.EUR).toBeGreaterThan(0);
    expect(rates.GBP).toBeGreaterThan(0);
    expect(rates.ZAR).toBeGreaterThan(0);
  });

  it("returns cached rates from a fresh fetch", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { EUR: 0.9, GBP: 0.8, ZAR: 18 } }),
    });
    const { getUsdRates, resetFxCache } = await import("@/lib/fx-rates");
    resetFxCache();
    const rates = await getUsdRates();
    expect(rates).toEqual({ EUR: 0.9, GBP: 0.8, ZAR: 18 });
  });
});