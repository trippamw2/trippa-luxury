// src/lib/attribution.ts
// Client-side UTM/referrer/landing-page capture for inquiry forms.

const STORAGE_KEY = "kivara_attr";
const MAX_LEN = 200;

function safeSessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function truncate(value: string): string {
  return value.length > MAX_LEN ? value.slice(0, MAX_LEN) : value;
}

function readParams(): Record<string, string> {
  const result: Record<string, string> = {};
  if (typeof window === "undefined") return result;
  try {
    const params = new URLSearchParams(window.location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    for (const key of keys) {
      const value = params.get(key);
      if (value && value.trim().length > 0) {
        result[key] = truncate(value.trim());
      }
    }
    if (document.referrer && document.referrer.trim().length > 0) {
      result.referrer = truncate(document.referrer.trim());
    }
    result.landing_path = truncate(window.location.pathname);
    result.captured_at = new Date().toISOString();
  } catch {
    // ignore
  }
  return result;
}

export function captureAttribution(): void {
  const storage = safeSessionStorage();
  if (!storage) return;
  try {
    if (storage.getItem(STORAGE_KEY)) return;
    const data = readParams();
    if (Object.keys(data).length === 0) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getAttribution(): Record<string, string> | null {
  const storage = safeSessionStorage();
  if (!storage) return null;
  try {
    captureAttribution();
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim().length > 0) {
        out[k] = v;
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}