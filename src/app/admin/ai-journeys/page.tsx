"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send, Eye, ArrowRight, Loader2, AlertCircle, Check, RefreshCw, X, Moon, Save, Database, MapPin, Hotel } from "lucide-react";
import type { CuratedJourney, GuestProfile, JourneyDay, DestinationAssignment } from "@/lib/ai/types";

// Available destinations with their properties
const DESTINATIONS_META = [
  {
    id: "lake-malawi",
    label: "Lake Malawi",
    properties: [
      { id: "kaya-mawa", name: "Kaya Mawa" },
      { id: "pumulani-lodge", name: "Pumulani Lodge" },
      { id: "blue-zebra-island-lodge", name: "Blue Zebra Island Lodge" },
      { id: "makokola-retreat", name: "Makokola Retreat" },
    ],
  },
  {
    id: "south-luangwa",
    label: "South Luangwa",
    properties: [
      { id: "chinzombo", name: "Chinzombo" },
      { id: "puku-ridge-camp", name: "Puku Ridge Camp" },
      { id: "shawa-luangwa", name: "Shawa Luangwa" },
      { id: "luangwa-river-camp", name: "Luangwa River Camp" },
    ],
  },
  {
    id: "zanzibar",
    label: "Zanzibar",
    properties: [
      { id: "xanadu-villas", name: "Xanadu Villas" },
      { id: "kilindi-zanzibar", name: "Kilindi Zanzibar" },
      { id: "baraza-resort-spa", name: "Baraza Resort & Spa" },
      { id: "the-palms-zanzibar", name: "The Palms Zanzibar" },
      { id: "the-residence-zanzibar", name: "The Residence Zanzibar" },
    ],
  },
];

const STYLE_OPTIONS = [
  { value: "romantic", label: "Romantic" },
  { value: "adventure", label: "Adventure" },
  { value: "relaxation", label: "Relaxation" },
  { value: "cultural", label: "Cultural" },
  { value: "mixed", label: "Mixed" },
];

const ACCOMMODATION_OPTIONS = [
  { value: "intimate-boutique", label: "Intimate Boutique" },
  { value: "luxury-resort", label: "Luxury Resort" },
  { value: "eco-camp", label: "Eco Camp" },
  { value: "private-villa", label: "Private Villa" },
];

const BUDGET_OPTIONS = [
  { value: "premium", label: "Premium ($500–$1,200/night)" },
  { value: "ultra-luxury", label: "Ultra-Luxury ($1,200+/night)" },
];

export default function AIJourneysPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    isCouple: true,
    travelStyle: "mixed",
    accommodationStyle: "luxury-resort",
    activityLevel: "moderate",
    budgetRange: "premium",
    specialOccasion: "",
    desiredNights: "10",
  });
  const [selectedDests, setSelectedDests] = useState<string[]>([]);
  const [destProperties, setDestProperties] = useState<Record<string, string>>({});
  const [destNights, setDestNights] = useState<Record<string, string>>({});
  const [journey, setJourney] = useState<CuratedJourney | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeDay, setActiveDay] = useState(1);
  const [showPdf, setShowPdf] = useState(false);
  const [pdfContent, setPdfContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedJourneyId, setSavedJourneyId] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setSavedJourneyId(null);

    // Build explicit destinations if any are selected
    const explicitDestinations: DestinationAssignment[] = selectedDests.map((destId) => ({
      destinationId: destId,
      propertyId: destProperties[destId] || undefined,
      nights: parseInt(destNights[destId]) || 3,
    }));

    const profile: GuestProfile = {
      id: `guest-${Date.now()}`,
      name: form.name,
      email: form.email,
      isCouple: form.isCouple,
      specialOccasion: form.specialOccasion || undefined,
      desiredNights: parseInt(form.desiredNights) || 10,
      preferences: {
        travelStyle: form.travelStyle as GuestProfile["preferences"]["travelStyle"],
        accommodationStyle: form.accommodationStyle as GuestProfile["preferences"]["accommodationStyle"],
        activityLevel: form.activityLevel as GuestProfile["preferences"]["activityLevel"],
        budgetRange: form.budgetRange as GuestProfile["preferences"]["budgetRange"],
      },
      ...(explicitDestinations.length > 0 ? { explicitDestinations } : {}),
    };

    try {
      const res = await fetch("/api/ai/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate journey");
      }

      const data = await res.json();
      setJourney(data.journey);
      setActiveDay(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!journey) return;
    setLoading(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "quote",
          data: {
            journey,
            meta: {
              reference: journey.id || "N/A",
              validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              depositRequired: Math.round(journey.pricing.total * 0.3),
              depositPercent: 30,
              paymentTerms: "30% deposit upon acceptance, balance due 60 days before travel",
            },
          },
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setPdfContent(result.html);
      } else {
        // Fallback: text-based preview
        const xfTotal = journey.pricing.transfers.reduce((s, t) => s + t.cost, 0);
        const accomSub = journey.pricing.subtotal - xfTotal;
        const lines = [
          "═══════════════════════════════════════",
          "  KIVARA LUXURY TRAVEL : JOURNEY PROPOSAL",
          "═══════════════════════════════════════",
          "",
          `  ${journey.title}`,
          `  ${journey.subtitle}`,
          "",
          `  Guest: ${journey.guestProfile.name}`,
          `  Duration: ${journey.duration} nights (${journey.itinerary.length} days)`,
          journey.guestProfile.specialOccasion ? `  Occasion: ${journey.guestProfile.specialOccasion}` : "",
          "",
          "  ── ITINERARY ──",
          ...journey.itinerary.map((d) => `  Day ${d.day}: ${d.title} @ ${d.accommodation}`),
          "",
          "  ── HIGHLIGHTS ──",
          ...journey.highlights.map((h) => `  · ${h}`),
          "",
          "  ── INVESTMENT ──",
          ...journey.pricing.accommodation.map(
            (a) => `  ${a.label}: ${a.nights} nights × $${a.ratePerNight}/night = $${a.subtotal.toLocaleString()}`
          ),
          "",
          `  Accommodation: $${accomSub.toLocaleString()}`,
          ...(xfTotal > 0 ? [`  Private Charters & Transfers: $${xfTotal.toLocaleString()}`] : []),
          `  Subtotal: $${journey.pricing.subtotal.toLocaleString()}`,
          `  Taxes & Fees (10%): $${journey.pricing.taxes.toLocaleString()}`,
          `  TOTAL: $${journey.pricing.total.toLocaleString()} ${journey.pricing.currency}`,
          "",
          "  ── INCLUDED ──",
          ...journey.includedExtras.map((e) => `  · ${e}`),
          "",
          `  Proposal ID: ${journey.id}`,
          `  Created: ${new Date(journey.createdAt).toLocaleDateString()}`,
          "",
          "  Kivara Concierge: concierge@kivara.luxury",
          "═══════════════════════════════════════",
        ];
        setPdfContent(lines.join("\n"));
      }
    } catch {
      setPdfContent("Failed to generate preview. Please try again.");
    }
    setLoading(false);
    setShowPdf(true);
  };

  const handleSaveJourney = async () => {
    if (!journey) return;
    setSaving(true);
    try {
      const payload = {
        title: journey.title,
        subtitle: journey.subtitle,
        guest_name: journey.guestProfile.name,
        guest_email: journey.guestProfile.email,
        is_couple: journey.guestProfile.isCouple,
        special_occasion: journey.guestProfile.specialOccasion || null,
        destinations: journey.destinations,
        duration: journey.duration,
        itinerary: journey.itinerary,
        pricing: journey.pricing,
        highlights: journey.highlights,
        included_extras: journey.includedExtras,
        preferences: journey.guestProfile.preferences,
        status: "draft",
      };
      const res = await fetch("/api/admin/journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save journey");
      }
      const data = await res.json();
      setSavedJourneyId(data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save journey");
    } finally {
      setSaving(false);
    }
  };

  const handleSendToClient = () => {
    if (!journey) return;
    const subject = encodeURIComponent(`Your Kivara Journey Proposal : ${journey.title}`);
    const body = encodeURIComponent(
      `Dear ${journey.guestProfile.name},\n\n` +
      `Thank you for allowing Kivara to curate your African journey.\n\n` +
      `We are delighted to present your personalised proposal:\n\n` +
      `${journey.title}\n` +
      `${journey.subtitle}\n\n` +
      `Duration: ${journey.duration} nights\n` +
      `Total Investment: $${journey.pricing.total.toLocaleString()} ${journey.pricing.currency}\n\n` +
      `Please find the full itinerary attached below.\n\n` +
      `We look forward to bringing this journey to life.\n\n` +
      `Warmly,\nKivara Concierge\nconcierge@kivara.luxury\n\n` +
      `---\n${journey.title}\n${journey.subtitle}\n` +
      `${journey.duration} nights | $${journey.pricing.total.toLocaleString()}\n\n` +
      `Highlights:\n` +
      journey.highlights.map(h => `- ${h}`).join("\n") +
      `\n\nItinerary:\n` +
      journey.itinerary.map(d => `Day ${d.day}: ${d.title} @ ${d.accommodation}`).join("\n")
    );
    window.open(`mailto:${journey.guestProfile.email}?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-soft-black">AI Journey Studio</h1>
        <p className="text-sm text-earth mt-1">
          Generate personalised itineraries using Kivara&apos;s curation engine.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guest Input Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-soft-black mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              Guest Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Guest Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black"
                  placeholder="e.g. Sarah & James Mitchell" />
              </div>
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black"
                  placeholder="guest@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Travel Style</label>
                <select value={form.travelStyle} onChange={(e) => setForm({ ...form, travelStyle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black">
                  {STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Accommodation Style</label>
                <select value={form.accommodationStyle} onChange={(e) => setForm({ ...form, accommodationStyle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black">
                  {ACCOMMODATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Duration (nights)</label>
                <input type="number" min="3" max="21" value={form.desiredNights}
                  onChange={(e) => setForm({ ...form, desiredNights: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black"
                  placeholder="e.g. 7" />
                <p className="text-[10px] text-earth mt-1">Total nights across all destinations (min 3)</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Activity Level</label>
                <div className="flex gap-2">
                  {["low", "moderate", "high"].map((level) => (
                    <button key={level} onClick={() => setForm({ ...form, activityLevel: level })}
                      className={`flex-1 py-2 text-xs font-medium border transition-colors ${
                        form.activityLevel === level
                          ? "bg-soft-black text-cream border-soft-black"
                          : "bg-white text-earth border-gray-200 hover:border-soft-black"
                      }`}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Budget</label>
                <select value={form.budgetRange} onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black">
                  {BUDGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {/* Destination Selector */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-xs font-semibold text-earth uppercase mb-3 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Destinations & Properties
                </h3>
                <p className="text-[10px] text-earth/60 mb-3">Select destinations and optionally pick specific properties. Leave properties empty for AI to choose.</p>
                {DESTINATIONS_META.map((dest) => {
                  const isSelected = selectedDests.includes(dest.id);
                  return (
                    <div key={dest.id} className="mb-3 pb-3 border-b border-gray-50 last:border-b-0">
                      <label className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input type="checkbox" checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDests([...selectedDests, dest.id]);
                              setDestNights({ ...destNights, [dest.id]: "3" });
                            } else {
                              setSelectedDests(selectedDests.filter((d) => d !== dest.id));
                              const newProps = { ...destProperties }; delete newProps[dest.id];
                              const newNights = { ...destNights }; delete newNights[dest.id];
                              setDestProperties(newProps);
                              setDestNights(newNights);
                            }
                          }}
                          className="w-4 h-4 border-gray-300" />
                        <span className="text-sm font-medium text-soft-black">{dest.label}</span>
                      </label>
                      {isSelected && (
                        <div className="ml-6 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-earth mb-0.5">Property (optional)</label>
                            <select value={destProperties[dest.id] || ""}
                              onChange={(e) => setDestProperties({ ...destProperties, [dest.id]: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black">
                              <option value="">AI Auto-Select</option>
                              {dest.properties.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-earth mb-0.5">Nights</label>
                            <input type="number" min="1" max="14" value={destNights[dest.id] || "3"}
                              onChange={(e) => setDestNights({ ...destNights, [dest.id]: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-medium text-earth mb-1">Special Occasion</label>
                <input type="text" value={form.specialOccasion} onChange={(e) => setForm({ ...form, specialOccasion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black"
                  placeholder="e.g. Honeymoon, Anniversary" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isCouple" checked={form.isCouple}
                  onChange={(e) => setForm({ ...form, isCouple: e.target.checked })}
                  className="w-4 h-4 border-gray-300" />
                <label htmlFor="isCouple" className="text-xs text-earth">Couple / Romantic Journey</label>
              </div>
              <button onClick={handleGenerate} disabled={loading || !form.name || !form.email}
                className="w-full py-3 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Curate Journey</>}
              </button>
            </div>
          </div>
        </div>

        {/* Generated Journey */}
        <div className="lg:col-span-2">
          {loading && (
            <div className="bg-white border border-gray-100 p-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-gold mx-auto mb-4" />
              <p className="text-sm text-earth">Crafting your personalised journey...</p>
            </div>
          )}
          {!journey && !loading ? (
            <div className="bg-white border border-gray-100 p-12 text-center">
              <Sparkles className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-soft-black mb-2">Your AI Journey Studio</h3>
              <p className="text-sm text-earth max-w-md mx-auto">
                Fill in the guest profile on the left and click &quot;Curate Journey&quot; to generate a personalised
                luxury African itinerary powered by Kivara&apos;s curation engine.
              </p>
            </div>
          ) : journey && !loading ? (
            <div className="space-y-6">
              {/* Journey Header */}
              <div className="bg-white border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-soft-black">{journey.title}</h2>
                    <p className="text-sm text-earth">{journey.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-soft-black">${journey.pricing.total.toLocaleString()}</p>
                    <p className="text-xs text-earth">{journey.pricing.currency}</p>
                    <p className="text-[10px] text-gold">{journey.guestProfile.isCouple ? "Per Couple" : "Per Person"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-earth">
                  <span className="flex items-center gap-1"><Moon className="w-3 h-3 text-gold" /> {journey.duration} nights</span>
                  <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" /> {journey.itinerary.length} days</span>
                  <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" /> {journey.destinations.length} destinations</span>
                  <span className="bg-soft-black/5 px-2 py-0.5">{journey.status}</span>
                </div>
              </div>

              {/* Highlights */}
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-soft-black mb-3">Journey Highlights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {journey.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-earth">
                      <Sparkles className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Day Navigation */}
              <div className="bg-white border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                  {journey.itinerary.map((day) => (
                    <button key={day.day} onClick={() => setActiveDay(day.day)}
                      className={`shrink-0 px-4 py-2 text-xs font-medium border transition-colors ${
                        activeDay === day.day
                          ? "bg-soft-black text-cream border-soft-black"
                          : "bg-white text-earth border-gray-200 hover:border-soft-black"
                      }`}>Day {day.day}</button>
                  ))}
                </div>
                {journey.itinerary.filter((d) => d.day === activeDay).map((day) => (
                  <DayCard key={day.day} day={day} />
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-soft-black mb-3">Pricing Breakdown</h3>
                {/* Table header */}
                <div className="flex items-center gap-3 text-[10px] text-earth uppercase tracking-wider font-semibold pb-2 border-b border-gray-100 mb-2">
                  <span className="flex-[2]">Property</span>
                  <span className="w-14 text-right">Nights</span>
                  <span className="w-24 text-right">PPPN</span>
                  <span className="w-24 text-right">{journey.guestProfile.isCouple ? "Per Couple" : "Per Person"}</span>
                  <span className="w-24 text-right">Subtotal</span>
                </div>
                {journey.pricing.accommodation.map((a, i) => {
                  const pppn = (a as any).ratePerNightPPPN || Math.round(a.ratePerNight / (journey.guestProfile.isCouple ? 2 : 1));
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-gray-50 last:border-b-0">
                      <span className="flex-[2] text-earth">{a.label}</span>
                      <span className="w-14 text-right text-earth">{a.nights}</span>
                      <span className="w-24 text-right text-soft-black font-medium">${pppn.toLocaleString()}</span>
                      <span className="w-24 text-right text-soft-black font-medium">${(pppn * (journey.guestProfile.isCouple ? 2 : 1)).toLocaleString()}</span>
                      <span className="w-24 text-right text-soft-black font-semibold">${a.subtotal.toLocaleString()}</span>
                    </div>
                  );
                })}
                <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-earth">Subtotal</span>
                    <span className="font-medium text-soft-black">${journey.pricing.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-earth">Taxes & Fees (10%)</span>
                    <span className="font-medium text-soft-black">${journey.pricing.taxes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-soft-black border-t border-gray-200 pt-2 mt-1">
                    <span>Total</span>
                    <span>${journey.pricing.total.toLocaleString()} {journey.pricing.currency}</span>
                  </div>
                </div>
                <p className="text-[10px] text-earth/60 mt-3 italic">
                  {journey.guestProfile.isCouple ? "PPPN = Per Person Per Night · Per Couple = PPPN × 2" : "PPPN = Per Person Per Night"}
                  {journey.guestProfile.isCouple ? " · Rates based on double occupancy" : " · Rates based on single occupancy"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <button onClick={handleSaveJourney} disabled={saving}
                  className="flex items-center gap-2 px-5 py-3 bg-gold text-cream text-sm font-medium hover:bg-gold-dark transition-colors disabled:opacity-50">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Database className="w-4 h-4" /> {savedJourneyId ? "Saved" : "Save Journey"}</>}
                </button>
                {savedJourneyId && (
                  <a href={`/admin/journeys?id=${savedJourneyId}`}
                    className="flex items-center gap-2 px-5 py-3 border border-gray-200 text-sm font-medium text-soft-black hover:border-soft-black transition-colors">
                    <Save className="w-4 h-4" /> Open in Editor
                  </a>
                )}
                <button onClick={handleSendToClient} disabled={!journey.guestProfile.email}
                  className="flex items-center gap-2 px-5 py-3 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black-light transition-colors disabled:opacity-50">
                  <Send className="w-4 h-4" /> Send to Client
                </button>
                <button onClick={handlePreviewPdf}
                  className="flex items-center gap-2 px-5 py-3 border border-gray-200 text-sm font-medium text-soft-black hover:border-soft-black transition-colors">
                  <Eye className="w-4 h-4" /> Preview Proposal
                </button>
                <button onClick={handleGenerate}
                  className="flex items-center gap-2 px-5 py-3 border border-gray-200 text-sm font-medium text-soft-black hover:border-soft-black transition-colors">
                  <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPdf && (
        <div className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPdf(false)}>
          <div className="bg-white max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-soft-black">Journey Proposal</h2>
              <button onClick={() => setShowPdf(false)} className="text-earth hover:text-soft-black"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {pdfContent.startsWith("<") ? (
                <iframe srcDoc={pdfContent} className="w-full h-full border-0" title="Journey Proposal" style={{ minHeight: "60vh" }} />
              ) : (
                <pre className="text-sm font-mono text-soft-black whitespace-pre-wrap leading-relaxed">{pdfContent}</pre>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowPdf(false)} className="px-4 py-2 border border-gray-200 text-sm text-earth hover:border-soft-black">Close</button>
              {!pdfContent.startsWith("<") && (
                <button onClick={() => { navigator.clipboard.writeText(pdfContent); alert("Proposal copied to clipboard!"); }}
                  className="px-4 py-2 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black-light">Copy to Clipboard</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DayCard({ day }: { day: JourneyDay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-soft-black">{day.title}</h4>
          <p className="text-xs text-earth">{day.location}</p>
        </div>
        <span className="text-xs bg-soft-black/5 px-2 py-1">{day.accommodation}</span>
      </div>
      {day.transfers.length > 0 && (
        <div className="bg-gray-50 p-3 space-y-2">
          {day.transfers.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <ArrowRight className="w-3 h-3 text-earth" />
              <span className="text-earth">{t.from} → {t.to}</span>
              <span className="text-earth/60">({t.mode} · {t.duration})</span>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {day.activities.map((act, i) => (
          <div key={i} className="flex items-start gap-3 p-2 hover:bg-gray-50 transition-colors">
            <div className="w-16 shrink-0 text-xs text-earth/60 text-right">{act.time || "Anytime"}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-soft-black">{act.title}</p>
              <p className="text-xs text-earth">{act.description}</p>
            </div>
            {act.included && <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 shrink-0">Included</span>}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {day.meals.map((meal) => (
          <span key={meal} className="text-[10px] bg-gold/10 text-gold-dark px-2 py-0.5">{meal}</span>
        ))}
      </div>
    </motion.div>
  );
}
