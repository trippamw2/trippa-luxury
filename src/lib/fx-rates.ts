// src/lib/fx-rates.ts
// Live FX rates with a 24h platform_settings cache and a static fallback.

import { EXCHANGE_RATES } from "@/lib/currency";

const CACHE_KEY = "fx_rates_json";
const FETCHED_AT_KEY = "fx_fetched_at";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FX_URL = "https://open.er-api.com/v6/latest/USD";

type FxRates = Record<"EUR" | "GBP" | "ZAR", number>;

const STATIC_FALLBACK: FxRates = {
  EUR: EXCHANGE_RATES.EUR,
  GBP: EXCHANGE_RATES.GBP,
  ZAR: EXCHANGE_RATES.ZAR,
};

let cachedRates: FxRates | null = null;
let cachedAt: number | null = null;

export function resetFxCache(): void {
  cachedRates = null;
  cachedAt = null;
}

async function readSettings(): Promise<Record<string, string>> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("platform_settings").select("key, value");
  if (error) throw error;
  const map: Record<string, string> = {};
  (data || []).forEach((s: { key: string; value: string }) => {
    map[s.key] = s.value;
  });
  return map;
}

async function writeSettings(key: string, value: string): Promise<void> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  await supabase
    .from("platform_settings")
    .upsert({ key, value }, { onConflict: "key" });
}

function parseCached(map: Record<string, string>): { rates: FxRates; fetchedAt: number } | null {
  const raw = map[CACHE_KEY];
  const at = map[FETCHED_AT_KEY];
  if (!raw || !at) return null;
  const fetchedAt = Number(at);
  if (!Number.isFinite(fetchedAt)) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.EUR === "number" && parsed.EUR > 0 &&
      typeof parsed?.GBP === "number" && parsed.GBP > 0 &&
      typeof parsed?.ZAR === "number" && parsed.ZAR > 0
    ) {
      return { rates: { EUR: parsed.EUR, GBP: parsed.GBP, ZAR: parsed.ZAR }, fetchedAt };
    }
  } catch {
    return null;
  }
  return null;
}

export async function getUsdRates(): Promise<FxRates> {
  // Module-level fast path.
  if (cachedRates && cachedAt && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedRates;
  }

  try {
    const map = await readSettings();
    const cached = parseCached(map);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      cachedRates = cached.rates;
      cachedAt = cached.fetchedAt;
      return cached.rates;
    }
  } catch {
    // Fall through to network/static.
  }

  try {
    const res = await fetch(FX_URL);
    if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
    const json = await res.json();
    const rates = json?.rates;
    if (
      typeof rates?.EUR === "number" && rates.EUR > 0 &&
      typeof rates?.GBP === "number" && rates.GBP > 0 &&
      typeof rates?.ZAR === "number" && rates.ZAR > 0
    ) {
      const fx: FxRates = { EUR: rates.EUR, GBP: rates.GBP, ZAR: rates.ZAR };
      cachedRates = fx;
      cachedAt = Date.now();
      try {
        await writeSettings(CACHE_KEY, JSON.stringify(fx));
        await writeSettings(FETCHED_AT_KEY, String(cachedAt));
      } catch {
        // Cache write failure is non-fatal.
      }
      return fx;
    }
    throw new Error("Invalid FX payload");
  } catch {
    return cachedRates ?? STATIC_FALLBACK;
  }
}

export async function formatCurrencyLive(
  amount: number,
  currency: "USD" | "EUR" | "GBP" | "ZAR" = "USD"
): Promise<string> {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  }
  try {
    const rates = await getUsdRates();
    const converted = amount * (rates[currency as "EUR" | "GBP" | "ZAR"] ?? 1);
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(converted);
  } catch {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  }
}