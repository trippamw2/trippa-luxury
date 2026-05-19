"use client";

import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle } from "lucide-react";

interface SettingsData {
  siteName: string;
  whatsapp: string;
  email: string;
  currency: string;
}

const LS_KEY = "kivara_settings";

function loadLocal(): SettingsData {
  if (typeof window === "undefined") {
    return { siteName: "Kivara", whatsapp: "+27871234567", email: "concierge@kivara.luxury", currency: "USD" };
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { siteName: "Kivara", whatsapp: "+27871234567", email: "concierge@kivara.luxury", currency: "USD" };
}

export default function AdminSettings() {
  const [form, setForm] = useState<SettingsData>(loadLocal);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [useApi, setUseApi] = useState(true);

  // Load from API on mount
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setForm({ siteName: json.siteName, whatsapp: json.whatsapp, email: json.email, currency: json.currency });
        setUseApi(true);
      })
      .catch(() => {
        // Fallback to localStorage
        setForm(loadLocal());
        setUseApi(false);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setApiError(null);
    setSaved(false);

    // Always persist locally
    localStorage.setItem(LS_KEY, JSON.stringify(form));

    if (useApi) {
      try {
        const res = await fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
      } catch (err: any) {
        setApiError(err.message);
        setSaved(false);
        return;
      }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-soft-black">Settings</h1>
          <p className="text-sm text-earth mt-1">Configure platform settings.</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-earth">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-soft-black">Settings</h1>
        <p className="text-sm text-earth mt-1">Configure platform settings.</p>
        {!useApi && (
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Settings saved locally only — connect Supabase for server-side persistence.
          </p>
        )}
      </div>

      <div className="bg-white border border-sand-light/50 p-6 max-w-2xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-soft-black mb-1">Site Name</label>
            <input
              type="text"
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
              className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-soft-black mb-1">WhatsApp Number</label>
            <input
              type="text"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-soft-black mb-1">Contact Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-soft-black mb-1">Default Currency</label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="ZAR">ZAR (R)</option>
            </select>
          </div>

          {apiError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {apiError}
            </p>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-colors"
            >
              Save Settings
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle className="w-4 h-4" /> Settings saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
