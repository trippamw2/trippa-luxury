"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send, Eye, ArrowRight, Loader2, AlertCircle, Check, RefreshCw } from "lucide-react";
import type { CuratedJourney, GuestProfile, JourneyDay } from "@/lib/ai/types";

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
  });
  const [journey, setJourney] = useState<CuratedJourney | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeDay, setActiveDay] = useState(1);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");

    const profile: GuestProfile = {
      id: `guest-${Date.now()}`,
      name: form.name,
      email: form.email,
      isCouple: form.isCouple,
      specialOccasion: form.specialOccasion || undefined,
      preferences: {
        travelStyle: form.travelStyle as GuestProfile["preferences"]["travelStyle"],
        accommodationStyle: form.accommodationStyle as GuestProfile["preferences"]["accommodationStyle"],
        activityLevel: form.activityLevel as GuestProfile["preferences"]["activityLevel"],
        budgetRange: form.budgetRange as GuestProfile["preferences"]["budgetRange"],
      },
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
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black"
                  placeholder="e.g. Sarah & James Mitchell"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black"
                  placeholder="guest@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Travel Style</label>
                <select
                  value={form.travelStyle}
                  onChange={(e) => setForm({ ...form, travelStyle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black"
                >
                  {STYLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Accommodation Style</label>
                <select
                  value={form.accommodationStyle}
                  onChange={(e) => setForm({ ...form, accommodationStyle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black"
                >
                  {ACCOMMODATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Activity Level</label>
                <div className="flex gap-2">
                  {["low", "moderate", "high"].map((level) => (
                    <button
                      key={level}
                      onClick={() => setForm({ ...form, activityLevel: level })}
                      className={`flex-1 py-2 text-xs font-medium border transition-colors ${
                        form.activityLevel === level
                          ? "bg-soft-black text-cream border-soft-black"
                          : "bg-white text-earth border-gray-200 hover:border-soft-black"
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Budget</label>
                <select
                  value={form.budgetRange}
                  onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black"
                >
                  {BUDGET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-earth mb-1">Special Occasion</label>
                <input
                  type="text"
                  value={form.specialOccasion}
                  onChange={(e) => setForm({ ...form, specialOccasion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black"
                  placeholder="e.g. Honeymoon, Anniversary"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCouple"
                  checked={form.isCouple}
                  onChange={(e) => setForm({ ...form, isCouple: e.target.checked })}
                  className="w-4 h-4 border-gray-300"
                />
                <label htmlFor="isCouple" className="text-xs text-earth">Couple / Romantic Journey</label>
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading || !form.name || !form.email}
                className="w-full py-3 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Curate Journey</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Generated Journey */}
        <div className="lg:col-span-2">
          {!journey ? (
            <div className="bg-white border border-gray-100 p-12 text-center">
              <Sparkles className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-soft-black mb-2">Your AI Journey Studio</h3>
              <p className="text-sm text-earth max-w-md mx-auto">
                Fill in the guest profile on the left and click &quot;Curate Journey&quot; to generate a personalised
                luxury African itinerary powered by Kivara&apos;s curation engine.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Journey Header */}
              <div className="bg-white border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-soft-black">{journey.title}</h2>
                    <p className="text-sm text-earth">{journey.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-soft-black">
                      ${journey.pricing.total.toLocaleString()}
                    </p>
                    <p className="text-xs text-earth">{journey.pricing.currency}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-earth">
                  <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" /> {journey.duration} nights</span>
                  <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" /> {journey.destinations.length} destinations</span>
                  <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-600" /> {journey.itinerary.length} days</span>
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
                    <button
                      key={day.day}
                      onClick={() => setActiveDay(day.day)}
                      className={`shrink-0 px-4 py-2 text-xs font-medium border transition-colors ${
                        activeDay === day.day
                          ? "bg-soft-black text-cream border-soft-black"
                          : "bg-white text-earth border-gray-200 hover:border-soft-black"
                      }`}
                    >
                      Day {day.day}
                    </button>
                  ))}
                </div>

                {journey.itinerary
                  .filter((d) => d.day === activeDay)
                  .map((day) => (
                    <DayCard key={day.day} day={day} />
                  ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="bg-white border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-soft-black mb-3">Pricing Breakdown</h3>
                <div className="space-y-2">
                  {journey.pricing.accommodation.map((a, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-earth">{a.label} ({a.nights} nights)</span>
                      <span className="font-medium text-soft-black">${a.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 mt-2">
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
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-5 py-3 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black-light transition-colors">
                  <Send className="w-4 h-4" /> Send to Client
                </button>
                <button className="flex items-center gap-2 px-5 py-3 border border-gray-200 text-sm font-medium text-soft-black hover:border-soft-black transition-colors">
                  <Eye className="w-4 h-4" /> Preview PDF
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-2 px-5 py-3 border border-gray-200 text-sm font-medium text-soft-black hover:border-soft-black transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayCard({ day }: { day: JourneyDay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-soft-black">{day.title}</h4>
          <p className="text-xs text-earth">{day.location}</p>
        </div>
        <span className="text-xs bg-soft-black/5 px-2 py-1">
          {day.accommodation}
        </span>
      </div>

      {/* Transfers */}
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

      {/* Activities */}
      <div className="space-y-2">
        {day.activities.map((act, i) => (
          <div key={i} className="flex items-start gap-3 p-2 hover:bg-gray-50 transition-colors">
            <div className="w-16 shrink-0 text-xs text-earth/60 text-right">
              {act.time || "Anytime"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-soft-black">{act.title}</p>
              <p className="text-xs text-earth">{act.description}</p>
            </div>
            {act.included && (
              <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 shrink-0">
                Included
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Meals */}
      <div className="flex gap-2">
        {day.meals.map((meal) => (
          <span key={meal} className="text-[10px] bg-gold/10 text-gold-dark px-2 py-0.5">
            {meal}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
