"use client";

import { useState, useEffect, useId } from "react";
import { CheckCircle, AlertCircle, CreditCard, Plane, Mail, ShieldAlert, ShieldCheck, Scale } from "lucide-react";

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

interface GovernanceData {
  inForce: GovernanceSettingsPayload;
  stored: GovernanceSettingsPayload;
  defaults: GovernanceSettingsPayload;
  docVersion: number;
  ratificationPhrase: string;
  stale: boolean;
}

interface GovernanceSettingsPayload {
  autonomyLevel: number;
  llmEnabled: boolean;
  outboundEnabled: boolean;
  internalWritesEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  ratifiedAt: string | null;
  ratifiedBy: string | null;
  ratifiedDocVersion: number | null;
  envOverride: boolean;
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
    return { siteName: "Kivara", whatsapp: "+27871234567", email: "concierge@kivara.africa", currency: "USD", bankDetails: defaultBankDetails, transferPricing: defaultTransferPricing };
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { siteName: "Kivara", whatsapp: "+27871234567", email: "concierge@kivara.africa", currency: "USD", bankDetails: defaultBankDetails, transferPricing: defaultTransferPricing };
}

/**
 * Ratification status, plus the one action that changes it.
 *
 * Split out so the state machine (unknown / unratified / stale / ratified) reads
 * as a table rather than as tangled conditionals, and so the panel can be
 * reasoned about on its own.
 */
function RatificationPanel({
  governance,
  ack,
  setAck,
  ackId,
  ratifying,
  onRatify,
  error,
  done,
}: {
  governance: GovernanceData;
  ack: string;
  setAck: (value: string) => void;
  ackId: string;
  ratifying: boolean;
  onRatify: () => void;
  error: string | null;
  done: boolean;
}) {
  const { inForce, stale, ratificationPhrase, docVersion } = governance;

  // A signature on an older document version is not a signature on this one, so it
  // must not read as ratified — the same rule `isRatified()` applies server-side.
  const signedCurrentVersion =
    inForce.ratifiedAt !== null && inForce.ratifiedDocVersion === docVersion;
  const state = stale ? "stale" : signedCurrentVersion ? "ratified" : "unratified";

  return (
    <div
      className={
        state === "ratified"
          ? "p-4 border border-emerald-200 bg-emerald-50/40"
          : "p-4 border border-amber-200 bg-amber-50/40"
      }
    >
      <p className="flex items-center gap-1.5 text-sm font-medium text-soft-black">
        {state === "ratified" ? (
          <><ShieldCheck className="w-4 h-4 text-emerald-600" /> Charter ratified</>
        ) : (
          <><ShieldAlert className="w-4 h-4 text-amber-600" />{state === "stale" ? " Ratification is stale" : " Charter unratified"}</>
        )}
      </p>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-32 text-earth">Document version</dt>
          <dd className="text-soft-black">{docVersion}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-32 text-earth">Ratified at</dt>
          <dd className={signedCurrentVersion ? "text-emerald-700" : "text-amber-700"}>
            {inForce.ratifiedAt
              ? new Date(inForce.ratifiedAt).toLocaleString()
              : "never ratified"}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-32 text-earth">Ratified by</dt>
          <dd className="text-soft-black">{inForce.ratifiedBy ?? "\u2014"}</dd>
        </div>
      </dl>

      {state === "ratified" && (
        <p className="text-xs text-earth mt-3">
          An owner has signed version {docVersion} of <code>GOVERNANCE.md</code>. Every decision in the
          ledger is now stamped with the charter state it was taken under.
        </p>
      )}

      {state === "unratified" && (
        <div className="mt-3">
          <p className="text-xs text-earth">
            No owner has signed this document, so it describes intent rather than adopted policy.
            This is recorded, not enforced: AI actions still run, every decision row is stamped
            <code> charter_ratified = false</code>, and nothing is blocked. Refusing to act while
            unratified would stop quotes, receipts, payment links and reminders, which is an owners&rsquo;
            decision to make rather than a setting to toggle.
          </p>
        </div>
      )}

      {state === "stale" && (
        <p className="text-xs text-earth mt-3">
          <code>GOVERNANCE.md</code> was changed after it was signed, so the earlier signature no
          longer covers version {docVersion}. Ratifying again adopts the current text.
        </p>
      )}

      {state !== "ratified" && (
        <div className="mt-4 pt-4 border-t border-amber-200/60">
          <label htmlFor={ackId} className="block text-sm font-medium text-soft-black mb-1">
            Ratify by typing this phrase
          </label>
          <p className="text-xs text-earth mb-2">
            Deliberately awkward: a signature must cost an intentional act, so it never happens on
            page load, from a deploy, or because something asked nicely. An agent that could type
            this would make the signature meaningless.
          </p>
          <p className="text-xs text-soft-black bg-white border border-sand-light/50 px-3 py-2 mb-2 font-mono break-words">
            {ratificationPhrase}
          </p>
          <input
            id={ackId}
            type="text"
            value={ack}
            onChange={(e) => setAck(e.target.value)}
            placeholder="Type the phrase exactly"
            autoComplete="off"
            className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors"
          />
          {ack.length > 0 && ack !== ratificationPhrase && (
            <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Does not match yet. The server judges this, not the browser.
            </p>
          )}
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={onRatify}
              disabled={ratifying || ack.length === 0}
              className="px-4 py-2 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-colors disabled:opacity-40"
            >
              {ratifying ? "Ratifying..." : state === "stale" ? "Re-ratify Charter" : "Ratify Charter"}
            </button>
            {done && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle className="w-4 h-4" /> Recorded
              </span>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1 mt-3">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const [form, setForm] = useState<SettingsData>(loadLocal);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [useApi, setUseApi] = useState(true);

  // ── Governance charter ratification ─────────────────────────────────
  // Server state, deliberately NOT part of `form` and never written to
  // localStorage: ratification is a signed act on a document, not a field an
  // operator edits. It lives in platform_settings and is read back from the API.
  //
  // `null` means "we do not know", which is not the same as unratified. When the
  // settings API is unreachable this page falls back to localStorage, and a
  // fallback must never be rendered as a verified governance state.
  const [governance, setGovernance] = useState<GovernanceData | null>(null);
  const [ack, setAck] = useState("");
  const [ratifying, setRatifying] = useState(false);
  const [ratifyError, setRatifyError] = useState<string | null>(null);
  const [ratifyDone, setRatifyDone] = useState(false);
  const ackId = useId();

  // ── Email pipeline diagnostics ─────────────────────────────────────
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailResult, setEmailResult] = useState<{
    ok: boolean;
    keyPresent?: boolean;
    keyValid?: boolean;
    sender?: { email: string; name: string } | null;
    testSend?: { ok: boolean; messageId?: string | null; error?: string } | null;
    guidance?: string[];
  } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function runEmailTest() {
    setEmailTesting(true);
    setEmailError(null);
    setEmailResult(null);
    try {
      const res = await fetch("/api/admin/settings/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: form.email }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setEmailResult(json);
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : "Email test failed");
    } finally {
      setEmailTesting(false);
    }
  }

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
        setGovernance(json.governance ?? null);
        setUseApi(true);
      })
      .catch(() => {
        // Fallback to localStorage
        setForm(loadLocal());
        setUseApi(false);
        // Explicitly leave governance null: the API never answered, so the charter
        // state is unknown rather than unratified.
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleRatify() {
    setRatifyError(null);
    setRatifyDone(false);
    setRatifying(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratify: true, ratificationAcknowledgement: ack }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
      // Re-read rather than assuming success, so the banner reflects what the
      // server actually recorded instead of what we hoped it recorded.
      const refreshed = await fetch("/api/admin/settings").then((r) => r.json());
      if (refreshed.governance) setGovernance(refreshed.governance);
      setAck("");
      setRatifyDone(true);
    } catch (err: unknown) {
      setRatifyError(err instanceof Error ? err.message : "Ratification failed");
    } finally {
      setRatifying(false);
    }
  }

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
        console.error("Failed to save settings via API:", err);
        setApiError(err instanceof Error ? err.message : "Failed to save settings");
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
          {/* ─── AI Governance Charter ──────────────────────────────── */}
          {/* First in the form: the charter's adoption state is the most
              consequential governance fact on this page. */}
          <div className="pt-6 border-t border-sand-light/50">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="w-4 h-4 text-gold" />
              <h2 className="text-sm font-semibold text-soft-black uppercase tracking-wider">AI Governance Charter</h2>
            </div>

            {governance === null ? (
              <div className="p-4 border border-amber-200 bg-amber-50/40">
                <p className="flex items-center gap-1.5 text-sm font-medium text-soft-black">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Charter state unknown
                </p>
                <p className="text-xs text-earth mt-2">
                  Governance state could not be read, so nothing can be claimed about whether this
                  charter has been ratified. Connect Supabase and reload to read its real status
                  rather than assuming one.
                </p>
              </div>
            ) : (
              <RatificationPanel
                governance={governance}
                ack={ack}
                setAck={setAck}
                ackId={ackId}
                ratifying={ratifying}
                onRatify={handleRatify}
                error={ratifyError}
                done={ratifyDone}
              />
            )}
          </div>

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

          {/* ─── Email Pipeline Section ─────────────────────────────── */}
          <div className="pt-6 border-t border-sand-light/50">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-gold" />
              <h2 className="text-sm font-semibold text-soft-black uppercase tracking-wider">Email Pipeline (Brevo)</h2>
            </div>
            <p className="text-xs text-earth mb-4">
              Tests the transactional email pipeline end-to-end: API key validity, sender identity, and a live delivery
              to the contact email above. Every send attempt is also recorded in the email log.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={runEmailTest}
                disabled={emailTesting || !form.email}
                className="px-4 py-2 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-colors disabled:opacity-40"
              >
                {emailTesting ? "Sending..." : "Run Email Test"}
              </button>
              {!form.email && (
                <span className="text-xs text-amber-600">Set a contact email above to run the test.</span>
              )}
            </div>
            {emailError && (
              <p className="text-sm text-red-600 flex items-center gap-1 mt-4">
                <AlertCircle className="w-4 h-4" />
                {emailError}
              </p>
            )}
            {emailResult && (
              <div className={`mt-4 p-4 border ${emailResult.ok ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/40"}`}>
                <p className="flex items-center gap-1.5 text-sm font-medium text-soft-black">
                  {emailResult.ok ? (
                    <><CheckCircle className="w-4 h-4 text-emerald-600" /> Email pipeline working</>
                  ) : (
                    <><AlertCircle className="w-4 h-4 text-amber-600" /> Email pipeline has issues</>
                  )}
                </p>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-32 text-earth">API key</dt>
                    <dd className={emailResult.keyPresent ? "text-emerald-700" : "text-red-600"}>
                      {emailResult.keyPresent ? "present" : "missing / placeholder"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-32 text-earth">Key valid</dt>
                    <dd className={emailResult.keyValid ? "text-emerald-700" : "text-red-600"}>
                      {emailResult.keyValid ? "valid" : "rejected by Brevo"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-32 text-earth">Sender</dt>
                    <dd className="text-soft-black">{emailResult.sender ? `${emailResult.sender.name} <${emailResult.sender.email}>` : "not configured"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-32 text-earth">Test send</dt>
                    <dd className={emailResult.testSend?.ok ? "text-emerald-700" : "text-red-600"}>
                      {emailResult.testSend?.ok
                        ? `delivered${emailResult.testSend.messageId ? ` (${emailResult.testSend.messageId})` : ""}`
                        : emailResult.testSend?.error || "not attempted"}
                    </dd>
                  </div>
                </dl>
                {emailResult.guidance && emailResult.guidance.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-amber-800">
                    {emailResult.guidance.map((g, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-amber-600">•</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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
