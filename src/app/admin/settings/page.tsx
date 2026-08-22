"use client";

import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, CreditCard, Plane } from "lucide-react";

interface BankDetailsData {
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  routingNumber: string;
  sortCode: string;
  bankCurrency: string;
  bankCountry: string;
}

interface TransferPricingData {
  charterLbyMfu: string;
  charterMfuZnz: string;
  charterLbyZnz: string;
  charterInternal: string;
  exitCharter: string;
  roadTransfer: string;
  parkFeesPerDay: string;
}

interface SettingsData {
  siteName: string;
  whatsapp: string;
  email: string;
  currency: string;
  bankDetails: BankDetailsData;
  transferPricing: TransferPricingData;
}

const LS_KEY = "kivara_settings";

const defaultBankDetails: BankDetailsData = {
  bankName: "",
  accountName: "",
  accountNumber: "",
  iban: "",
  swiftCode: "",
  routingNumber: "",
  sortCode: "",
  bankCurrency: "USD",
  bankCountry: "",
};

const defaultTransferPricing: TransferPricingData = {
  charterLbyMfu: "1850",
  charterMfuZnz: "1450",
  charterLbyZnz: "1650",
  charterInternal: "350",
  exitCharter: "750",
  roadTransfer: "120",
  parkFeesPerDay: "120",
};

function loadLocal(): SettingsData {
  if (typeof window === "undefined") {
    return { siteName: "Kivara", whatsapp: "+27871234567", email: "concierge@kivara.luxury", currency: "USD", bankDetails: defaultBankDetails, transferPricing: defaultTransferPricing };
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { siteName: "Kivara", whatsapp: "+27871234567", email: "concierge@kivara.luxury", currency: "USD", bankDetails: defaultBankDetails, transferPricing: defaultTransferPricing };
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
        setForm({
          siteName: json.siteName,
          whatsapp: json.whatsapp,
          email: json.email,
          currency: json.currency,
          bankDetails: json.bankDetails || defaultBankDetails,
          transferPricing: json.transferPricing || defaultTransferPricing,
        });
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
      } catch (err: unknown) {
        setApiError(err instanceof Error ? err.message : `HTTP error`);
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
            Settings saved locally only : connect Supabase for server-side persistence.
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

          {/* ─── Bank Details Section ─────────────────────────────── */}
          <div className="pt-6 border-t border-sand-light/50">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-gold" />
              <h2 className="text-sm font-semibold text-soft-black uppercase tracking-wider">Bank Details (Wire Transfer)</h2>
            </div>
            <p className="text-xs text-earth mb-4">Configure your bank account details for wire transfer payments. These will appear on invoices and payment reminders.</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Bank Name</label>
                <input
                  type="text"
                  value={form.bankDetails.bankName}
                  onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, bankName: e.target.value } })}
                  placeholder="e.g. Standard Bank"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Account Name</label>
                <input
                  type="text"
                  value={form.bankDetails.accountName}
                  onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, accountName: e.target.value } })}
                  placeholder="e.g. Kivara Travel Pty Ltd"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Account Number</label>
                <input
                  type="text"
                  value={form.bankDetails.accountNumber}
                  onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, accountNumber: e.target.value } })}
                  placeholder="e.g. 123456789"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">SWIFT / BIC Code</label>
                <input
                  type="text"
                  value={form.bankDetails.swiftCode}
                  onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, swiftCode: e.target.value } })}
                  placeholder="e.g. SBZAJJAXXX"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">IBAN</label>
                <input
                  type="text"
                  value={form.bankDetails.iban}
                  onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, iban: e.target.value } })}
                  placeholder="e.g. ZA00012345678901234567"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Routing Number</label>
                <input
                  type="text"
                  value={form.bankDetails.routingNumber}
                  onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, routingNumber: e.target.value } })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Sort Code</label>
                <input
                  type="text"
                  value={form.bankDetails.sortCode}
                  onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, sortCode: e.target.value } })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Bank Currency</label>
                <select
                  value={form.bankDetails.bankCurrency}
                  onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, bankCurrency: e.target.value } })}
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="ZAR">ZAR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Bank Country</label>
                <input
                  type="text"
                  value={form.bankDetails.bankCountry}
                  onChange={(e) => setForm({ ...form, bankDetails: { ...form.bankDetails, bankCountry: e.target.value } })}
                  placeholder="e.g. South Africa"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
            </div>
          </div>

          {/* ─── Transfer Pricing Section ─────────────────────────────── */}
          <div className="pt-6 border-t border-sand-light/50">
            <div className="flex items-center gap-2 mb-4">
              <Plane className="w-4 h-4 text-gold" />
              <h2 className="text-sm font-semibold text-soft-black uppercase tracking-wider">Transfer &amp; Charter Pricing</h2>
            </div>
            <p className="text-xs text-earth mb-4">Configure supplier rates for charter flights, road transfers, and park fees. These prices are used by the AI journey engine for accurate cost calculations.</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Lilongwe &rarr; Mfuwe (pp)</label>
                <input
                  type="number"
                  value={form.transferPricing.charterLbyMfu}
                  onChange={(e) => setForm({ ...form, transferPricing: { ...form.transferPricing, charterLbyMfu: e.target.value } })}
                  placeholder="1850"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Mfuwe &rarr; Zanzibar (pp)</label>
                <input
                  type="number"
                  value={form.transferPricing.charterMfuZnz}
                  onChange={(e) => setForm({ ...form, transferPricing: { ...form.transferPricing, charterMfuZnz: e.target.value } })}
                  placeholder="1450"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Lilongwe &rarr; Zanzibar (pp)</label>
                <input
                  type="number"
                  value={form.transferPricing.charterLbyZnz}
                  onChange={(e) => setForm({ ...form, transferPricing: { ...form.transferPricing, charterLbyZnz: e.target.value } })}
                  placeholder="1650"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Internal Charter (pp)</label>
                <input
                  type="number"
                  value={form.transferPricing.charterInternal}
                  onChange={(e) => setForm({ ...form, transferPricing: { ...form.transferPricing, charterInternal: e.target.value } })}
                  placeholder="350"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Exit Charter (pp)</label>
                <input
                  type="number"
                  value={form.transferPricing.exitCharter}
                  onChange={(e) => setForm({ ...form, transferPricing: { ...form.transferPricing, exitCharter: e.target.value } })}
                  placeholder="750"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-soft-black mb-1">Road Transfer (pp)</label>
                <input
                  type="number"
                  value={form.transferPricing.roadTransfer}
                  onChange={(e) => setForm({ ...form, transferPricing: { ...form.transferPricing, roadTransfer: e.target.value } })}
                  placeholder="120"
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-soft-black mb-1">Park Fees per Person per Day</label>
                <input
                  type="number"
                  value={form.transferPricing.parkFeesPerDay}
                  onChange={(e) => setForm({ ...form, transferPricing: { ...form.transferPricing, parkFeesPerDay: e.target.value } })}
                  placeholder="120"
                  className="w-full max-w-xs px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
                />
              </div>
            </div>
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
