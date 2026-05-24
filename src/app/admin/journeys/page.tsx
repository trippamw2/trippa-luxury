"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Edit2, Trash2, X, Check, AlertCircle, Loader2, Save,
  Eye, Send, Calendar, Users, MapPin, DollarSign, Moon, ArrowRight, Sparkles,
  FileText, Tag, Clock, Sun, Umbrella, Plane, Car, Hotel, Activity as ActivityIcon,
  ChevronDown, ChevronUp, Copy
} from "lucide-react";
import { useApiData } from "@/lib/use-api-data";
import type { JourneyDay, Activity, Transfer, JourneyPricing } from "@/lib/ai/types";

interface SavedJourney {
  id: string;
  title: string;
  subtitle: string;
  quoteRef: string;
  guestProfileId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  isCouple: boolean;
  specialOccasion: string;
  destinations: string[];
  duration: number;
  itinerary: JourneyDay[];
  pricing: JourneyPricing;
  highlights: string[];
  includedExtras: string[];
  preferences: Record<string, any>;
  status: "draft" | "sent" | "viewed" | "modified" | "accepted" | "booked" | "archived";
  version: number;
  inquiryId: string;
  bookingId: string;
  sentAt: string;
  acceptedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Extend AccommodationItem type for the editor
interface AccommodationItem {
  label: string;
  nights: number;
  ratePerNight: number;
  ratePerNightPPPN: number;
  subtotal: number;
}

function mapJourney(item: any): SavedJourney {
  return {
    id: item.id || "",
    title: item.title || "",
    subtitle: item.subtitle || "",
    quoteRef: item.quoteRef || "",
    guestProfileId: item.guestProfileId || "",
    guestName: item.guestName || "",
    guestEmail: item.guestEmail || "",
    guestPhone: item.guestPhone || "",
    isCouple: item.isCouple ?? true,
    specialOccasion: item.specialOccasion || "",
    destinations: item.destinations || [],
    duration: item.duration || 0,
    itinerary: item.itinerary || [],
    pricing: item.pricing || { accommodation: [], activities: [], transfers: [], subtotal: 0, taxes: 0, total: 0, currency: "USD" },
    highlights: item.highlights || [],
    includedExtras: item.includedExtras || [],
    preferences: item.preferences || {},
    status: item.status || "draft",
    version: item.version || 1,
    inquiryId: item.inquiryId || "",
    bookingId: item.bookingId || "",
    sentAt: item.sentAt || "",
    acceptedAt: item.acceptedAt || "",
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
  };
}

function mapJourneyToApi(item: Partial<SavedJourney>): any {
  return {
    title: item.title,
    subtitle: item.subtitle,
    guest_name: item.guestName,
    guest_email: item.guestEmail,
    guest_phone: item.guestPhone,
    is_couple: item.isCouple,
    special_occasion: item.specialOccasion,
    destinations: item.destinations,
    duration: item.duration,
    itinerary: item.itinerary,
    pricing: item.pricing,
    highlights: item.highlights,
    included_extras: item.includedExtras,
    preferences: item.preferences,
    status: item.status,
    version: item.version,
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-gray-600", bg: "bg-gray-100" },
  sent: { label: "Sent", color: "text-blue-700", bg: "bg-blue-50" },
  viewed: { label: "Viewed", color: "text-indigo-700", bg: "bg-indigo-50" },
  modified: { label: "Modified", color: "text-amber-700", bg: "bg-amber-50" },
  accepted: { label: "Accepted", color: "text-emerald-700", bg: "bg-emerald-50" },
  booked: { label: "Booked", color: "text-teal-700", bg: "bg-teal-50" },
  archived: { label: "Archived", color: "text-gray-400", bg: "bg-gray-100" },
};

const STATUS_OPTIONS = ["draft", "sent", "viewed", "modified", "accepted", "booked", "archived"];

const ACTIVITY_TYPES: { value: Activity["type"]; label: string }[] = [
  { value: "safari", label: "Safari" },
  { value: "water-sports", label: "Water Sports" },
  { value: "cultural", label: "Cultural" },
  { value: "spa", label: "Spa & Wellness" },
  { value: "dining", label: "Dining" },
  { value: "relaxation", label: "Relaxation" },
  { value: "adventure", label: "Adventure" },
  { value: "wellness", label: "Wellness" },
  { value: "other", label: "Other" },
];

const TRANSFER_MODES: { value: Transfer["mode"]; label: string }[] = [
  { value: "flight", label: "Flight" },
  { value: "road", label: "Road Transfer" },
  { value: "boat", label: "Boat" },
  { value: "helicopter", label: "Helicopter" },
];

function emptyDay(day: number): JourneyDay {
  return { day, title: `Day ${day}`, location: "", accommodation: "", meals: [], activities: [], transfers: [], highlights: [], notes: "" };
}

function recalcPricing(p: JourneyPricing): JourneyPricing {
  const accomTotal = (p.accommodation || []).reduce((s, a) => s + (a.subtotal || a.nights * a.ratePerNight), 0);
  const actTotal = (p.activities || []).reduce((s, a) => s + a.cost, 0);
  const xferTotal = (p.transfers || []).reduce((s, t) => s + t.cost, 0);
  const sub = accomTotal + actTotal + xferTotal;
  const taxes = Math.round(sub * 0.1 * 100) / 100;
  return { ...p, subtotal: sub, taxes, total: sub + taxes };
}

export default function AdminJourneyEditor() {
  const searchParams = useSearchParams();
  const openId = searchParams.get("id");

  const { data: journeys, loading, create, update, remove, refresh } = useApiData<SavedJourney>("journeys", {
    mapFromApi: mapJourney,
    mapToApi: mapJourneyToApi,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<SavedJourney | null>(null);
  const [editing, setEditing] = useState<SavedJourney | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "itinerary" | "pricing" | "guest">("details");
  const [activeDay, setActiveDay] = useState(1);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Auto-open from URL param
  useEffect(() => {
    if (openId && journeys.length > 0) {
      const found = journeys.find((j) => j.id === openId);
      if (found) {
        setSelected(found);
        setEditing(JSON.parse(JSON.stringify(found)));
      }
    }
  }, [openId, journeys]);

  const filtered = journeys.filter((j) => {
    const matchSearch = !search ||
      j.guestName.toLowerCase().includes(search.toLowerCase()) ||
      j.guestEmail.toLowerCase().includes(search.toLowerCase()) ||
      j.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    // Re-calc pricing before save
    const withPricing = { ...editing, pricing: recalcPricing(editing.pricing) };
    const result = await update(editing.id, withPricing);
    if (result) {
      setSelected(result);
      setEditing(result);
      showToast("Journey saved", "success");
    } else {
      showToast("Failed to save journey", "error");
    }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!editing) return;
    const payload: any = { status: newStatus };
    if (newStatus === "sent") payload.sentAt = new Date().toISOString();
    if (newStatus === "accepted") payload.acceptedAt = new Date().toISOString();
    const result = await update(editing.id, payload);
    if (result) {
      setSelected(result);
      setEditing({ ...editing, ...result });
      showToast(`Status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}`, "success");
    } else {
      showToast("Failed to update status", "error");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const ok = await remove(selected.id);
    if (ok) {
      setSelected(null);
      setEditing(null);
      setShowDelete(false);
      showToast("Journey deleted", "success");
    } else {
      showToast("Failed to delete journey", "error");
    }
  };

  const handleDuplicate = async () => {
    if (!editing) return;
    const copy = { ...editing };
    delete (copy as any).id;
    copy.title = `${copy.title} (Copy)`;
    copy.status = "draft";
    const result = await create(mapJourneyToApi(copy));
    if (result) {
      showToast("Journey duplicated", "success");
      refresh();
    }
  };

  // Itinerary helpers
  const addDay = () => {
    if (!editing) return;
    const nextDay = editing.itinerary.length + 1;
    setEditing({ ...editing, itinerary: [...editing.itinerary, emptyDay(nextDay)], duration: nextDay });
    setActiveDay(nextDay);
  };

  const removeDay = (day: number) => {
    if (!editing || editing.itinerary.length <= 1) return;
    const newIt = editing.itinerary.filter((d) => d.day !== day).map((d, i) => ({ ...d, day: i + 1 }));
    setEditing({ ...editing, itinerary: newIt, duration: newIt.length });
    setActiveDay(Math.min(day, newIt.length));
  };

  const updateDay = (day: number, updates: Partial<JourneyDay>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      itinerary: editing.itinerary.map((d) => (d.day === day ? { ...d, ...updates } : d)),
    });
  };

  const addActivity = (day: number) => {
    if (!editing) return;
    const newAct: Activity = { title: "", description: "", duration: "2 hours", included: true, type: "other", time: "09:00" };
    updateDay(day, {
      activities: [...(editing.itinerary.find((d) => d.day === day)?.activities || []), newAct],
    });
  };

  const updateActivity = (day: number, idx: number, updates: Partial<Activity>) => {
    if (!editing) return;
    const dayData = editing.itinerary.find((d) => d.day === day);
    if (!dayData) return;
    const newActs = [...dayData.activities];
    newActs[idx] = { ...newActs[idx], ...updates };
    updateDay(day, { activities: newActs });
  };

  const removeActivity = (day: number, idx: number) => {
    if (!editing) return;
    const dayData = editing.itinerary.find((d) => d.day === day);
    if (!dayData) return;
    updateDay(day, { activities: dayData.activities.filter((_, i) => i !== idx) });
  };

  const addTransfer = (day: number) => {
    if (!editing) return;
    const newTr: Transfer = { from: "", to: "", mode: "road", duration: "30 min", cost: 0 };
    updateDay(day, {
      transfers: [...(editing.itinerary.find((d) => d.day === day)?.transfers || []), newTr],
    });
  };

  const updateTransfer = (day: number, idx: number, updates: Partial<Transfer>) => {
    if (!editing) return;
    const dayData = editing.itinerary.find((d) => d.day === day);
    if (!dayData) return;
    const newXfers = [...dayData.transfers];
    newXfers[idx] = { ...newXfers[idx], ...updates };
    updateDay(day, { transfers: newXfers });
  };

  const removeTransfer = (day: number, idx: number) => {
    if (!editing) return;
    const dayData = editing.itinerary.find((d) => d.day === day);
    if (!dayData) return;
    updateDay(day, { transfers: dayData.transfers.filter((_, i) => i !== idx) });
  };

  const addMeal = (day: number, meal: string) => {
    if (!editing || !meal.trim()) return;
    const dayData = editing.itinerary.find((d) => d.day === day);
    if (!dayData) return;
    updateDay(day, { meals: [...dayData.meals, meal.trim()] });
  };

  const removeMeal = (day: number, idx: number) => {
    if (!editing) return;
    const dayData = editing.itinerary.find((d) => d.day === day);
    if (!dayData) return;
    updateDay(day, { meals: dayData.meals.filter((_, i) => i !== idx) });
  };

  // Pricing helpers
  const updateAccomItem = (idx: number, updates: Partial<{ label: string; nights: number; ratePerNight: number; ratePerNightPPPN: number }>) => {
    if (!editing) return;
    const newAccom = [...(editing.pricing.accommodation || [])] as any[];
    const current = newAccom[idx];
    const merged = { ...current, ...updates };
    // If PPPN was updated, recalc ratePerNight
    if (updates.ratePerNightPPPN !== undefined) {
      merged.ratePerNight = updates.ratePerNightPPPN * (editing.isCouple ? 2 : 1);
    }
    merged.subtotal = (merged.nights) * (merged.ratePerNight || 0);
    newAccom[idx] = merged;
    setEditing({ ...editing, pricing: recalcPricing({ ...editing.pricing, accommodation: newAccom }) });
  };

  const addAccomItem = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      pricing: recalcPricing({
        ...editing.pricing,
        accommodation: [...(editing.pricing.accommodation || []), { label: "", nights: 1, ratePerNight: 0, ratePerNightPPPN: 0, subtotal: 0 }],
      }),
    });
  };

  const removeAccomItem = (idx: number) => {
    if (!editing) return;
    const newAccom = (editing.pricing.accommodation || []).filter((_, i) => i !== idx);
    setEditing({ ...editing, pricing: recalcPricing({ ...editing.pricing, accommodation: newAccom }) });
  };

  const updateActivityCost = (idx: number, cost: number) => {
    if (!editing) return;
    const newActs = [...(editing.pricing.activities || [])];
    newActs[idx] = { ...newActs[idx], cost };
    setEditing({ ...editing, pricing: recalcPricing({ ...editing.pricing, activities: newActs }) });
  };

  const addActivityCost = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      pricing: recalcPricing({
        ...editing.pricing,
        activities: [...(editing.pricing.activities || []), { label: "", cost: 0 }],
      }),
    });
  };

  const removeActivityCost = (idx: number) => {
    if (!editing) return;
    const newActs = (editing.pricing.activities || []).filter((_, i) => i !== idx);
    setEditing({ ...editing, pricing: recalcPricing({ ...editing.pricing, activities: newActs }) });
  };

  const updateTransferCost = (idx: number, cost: number) => {
    if (!editing) return;
    const newXfers = [...(editing.pricing.transfers || [])];
    newXfers[idx] = { ...newXfers[idx], cost };
    setEditing({ ...editing, pricing: recalcPricing({ ...editing.pricing, transfers: newXfers }) });
  };

  const addTransferCost = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      pricing: recalcPricing({
        ...editing.pricing,
        transfers: [...(editing.pricing.transfers || []), { label: "", cost: 0 }],
      }),
    });
  };

  const removeTransferCost = (idx: number) => {
    if (!editing) return;
    const newXfers = (editing.pricing.transfers || []).filter((_, i) => i !== idx);
    setEditing({ ...editing, pricing: recalcPricing({ ...editing.pricing, transfers: newXfers }) });
  };

  // Highlights helpers
  const [highlightInput, setHighlightInput] = useState("");

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 text-sm flex items-center gap-2 shadow-lg ${
              toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
            {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {selected && editing ? (
        /* ── Editor View ── */
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => { setSelected(null); setEditing(null); }}
                className="p-2 text-earth hover:text-soft-black border border-gray-200 hover:border-soft-black transition-colors">
                <X className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-soft-black">{editing.title || "Untitled Journey"}</h1>
                <p className="text-xs text-earth">{editing.guestName} · v{editing.version} · {editing.duration} nights</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={editing.status} onChange={(e) => handleStatusChange(e.target.value)}
                className={`text-xs font-medium px-2 py-1 border focus:outline-none ${STATUS_CONFIG[editing.status]?.bg || "bg-gray-100"} ${STATUS_CONFIG[editing.status]?.color || "text-gray-600"}`}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="text-gray-700">{STATUS_CONFIG[s]?.label || s}</option>
                ))}
              </select>
              <button onClick={handleDuplicate}
                className="p-2 text-earth hover:text-soft-black border border-gray-200 hover:border-soft-black transition-colors"
                title="Duplicate">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={() => setShowDelete(true)}
                className="p-2 text-earth hover:text-red-500 border border-gray-200 hover:border-red-200 transition-colors"
                title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black-light transition-colors disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save</>}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-gray-200 mb-6">
            {(["details", "itinerary", "pricing", "guest"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-soft-black text-soft-black"
                    : "border-transparent text-earth hover:text-soft-black"
                }`}>
                {tab === "details" ? "Details" : tab === "itinerary" ? "Itinerary" : tab === "pricing" ? "Pricing" : "Guest"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white border border-gray-100 p-6">
            {/* ── DETAILS TAB ── */}
            {activeTab === "details" && (
              <div className="space-y-5 max-w-2xl">
                <div>
                  <label className="block text-xs font-medium text-earth mb-1">Title</label>
                  <input type="text" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth mb-1">Subtitle</label>
                  <input type="text" value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth mb-1">Duration (nights)</label>
                    <input type="number" value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth mb-1">Quote Reference</label>
                    <input type="text" value={editing.quoteRef} onChange={(e) => setEditing({ ...editing, quoteRef: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth mb-1">Destinations</label>
                  <input type="text" value={editing.destinations.join(", ")}
                    onChange={(e) => setEditing({ ...editing, destinations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="Comma-separated: lake-malawi, south-luangwa, zanzibar"
                    className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth mb-1">Highlights</label>
                  <div className="space-y-2">
                    {editing.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" value={h} onChange={(e) => {
                          const newH = [...editing.highlights];
                          newH[i] = e.target.value;
                          setEditing({ ...editing, highlights: newH });
                        }}
                          className="flex-1 px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                        <button onClick={() => setEditing({ ...editing, highlights: editing.highlights.filter((_, j) => j !== i) })}
                          className="p-1 text-earth hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={() => setEditing({ ...editing, highlights: [...editing.highlights, ""] })}
                      className="text-xs text-gold hover:text-gold-dark flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Highlight
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth mb-1">Included Extras</label>
                  <div className="space-y-2">
                    {editing.includedExtras.map((ex, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" value={ex} onChange={(e) => {
                          const newEx = [...editing.includedExtras];
                          newEx[i] = e.target.value;
                          setEditing({ ...editing, includedExtras: newEx });
                        }}
                          className="flex-1 px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                        <button onClick={() => setEditing({ ...editing, includedExtras: editing.includedExtras.filter((_, j) => j !== i) })}
                          className="p-1 text-earth hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={() => setEditing({ ...editing, includedExtras: [...editing.includedExtras, ""] })}
                      className="text-xs text-gold hover:text-gold-dark flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Extra
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── ITINERARY TAB ── */}
            {activeTab === "itinerary" && (
              <div>
                {/* Day Navigation */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                  {editing.itinerary.map((day) => (
                    <button key={day.day} onClick={() => setActiveDay(day.day)}
                      className={`shrink-0 px-4 py-2 text-xs font-medium border transition-colors ${
                        activeDay === day.day
                          ? "bg-soft-black text-cream border-soft-black"
                          : "bg-white text-earth border-gray-200 hover:border-soft-black"
                      }`}>
                      Day {day.day}
                    </button>
                  ))}
                  <button onClick={addDay}
                    className="shrink-0 px-4 py-2 text-xs font-medium border border-dashed border-gray-300 text-earth hover:border-soft-black hover:text-soft-black transition-colors flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Day
                  </button>
                </div>

                {/* Active Day Editor */}
                {editing.itinerary.filter((d) => d.day === activeDay).map((day) => (
                  <div key={day.day} className="space-y-5 max-w-3xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-soft-black">Day {day.day}</h3>
                      <button onClick={() => removeDay(day.day)}
                        className="text-xs text-earth hover:text-red-500 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Remove Day
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-earth mb-1">Title</label>
                        <input type="text" value={day.title} onChange={(e) => updateDay(day.day, { title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-earth mb-1">Location</label>
                        <input type="text" value={day.location} onChange={(e) => updateDay(day.day, { location: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-earth mb-1">Accommodation</label>
                        <input type="text" value={day.accommodation} onChange={(e) => updateDay(day.day, { accommodation: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-medium text-earth mb-1">Notes</label>
                      <textarea value={day.notes || ""} onChange={(e) => updateDay(day.day, { notes: e.target.value })}
                        rows={2} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                    </div>

                    {/* Transfers */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-earth uppercase flex items-center gap-1"><Car className="w-3 h-3" /> Transfers</h4>
                        <button onClick={() => addTransfer(day.day)}
                          className="text-xs text-gold hover:text-gold-dark flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add Transfer
                        </button>
                      </div>
                      <div className="space-y-2">
                        {day.transfers.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-gray-50">
                            <input type="text" value={t.from} onChange={(e) => updateTransfer(day.day, i, { from: e.target.value })}
                              placeholder="From" className="flex-1 px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                            <ArrowRight className="w-3 h-3 text-earth shrink-0" />
                            <input type="text" value={t.to} onChange={(e) => updateTransfer(day.day, i, { to: e.target.value })}
                              placeholder="To" className="flex-1 px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                            <select value={t.mode} onChange={(e) => updateTransfer(day.day, i, { mode: e.target.value as Transfer["mode"] })}
                              className="px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black">
                              {TRANSFER_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <input type="text" value={t.duration} onChange={(e) => updateTransfer(day.day, i, { duration: e.target.value })}
                              placeholder="Duration" className="w-20 px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                            <input type="number" value={t.cost || 0} onChange={(e) => updateTransfer(day.day, i, { cost: parseInt(e.target.value) || 0 })}
                              placeholder="Cost" className="w-16 px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                            <button onClick={() => removeTransfer(day.day, i)}
                              className="p-1 text-earth hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Activities */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-earth uppercase flex items-center gap-1"><ActivityIcon className="w-3 h-3" /> Activities</h4>
                        <button onClick={() => addActivity(day.day)}
                          className="text-xs text-gold hover:text-gold-dark flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add Activity
                        </button>
                      </div>
                      <div className="space-y-3">
                        {day.activities.map((act, i) => (
                          <div key={i} className="p-3 border border-gray-200 space-y-2">
                            <div className="flex items-center gap-2">
                              <input type="time" value={act.time || ""} onChange={(e) => updateActivity(day.day, i, { time: e.target.value })}
                                className="w-24 px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                              <input type="text" value={act.title} onChange={(e) => updateActivity(day.day, i, { title: e.target.value })}
                                placeholder="Activity title"
                                className="flex-1 px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                              <select value={act.type} onChange={(e) => updateActivity(day.day, i, { type: e.target.value as Activity["type"] })}
                                className="px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black">
                                {ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                              <label className="flex items-center gap-1 text-[10px] text-earth whitespace-nowrap">
                                <input type="checkbox" checked={act.included} onChange={(e) => updateActivity(day.day, i, { included: e.target.checked })}
                                  className="w-3 h-3" />
                                Included
                              </label>
                              <button onClick={() => removeActivity(day.day, i)}
                                className="p-1 text-earth hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="text" value={act.description} onChange={(e) => updateActivity(day.day, i, { description: e.target.value })}
                                placeholder="Description"
                                className="flex-1 px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                              <input type="text" value={act.duration} onChange={(e) => updateActivity(day.day, i, { duration: e.target.value })}
                                placeholder="Duration"
                                className="w-24 px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Meals */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-earth uppercase flex items-center gap-1"><Sun className="w-3 h-3" /> Meals</h4>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {day.meals.map((m, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-gold/10 text-gold-dark px-2 py-0.5">
                            {m}
                            <button onClick={() => removeMeal(day.day, i)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                      </div>
                      <MealInput onAdd={(meal) => addMeal(day.day, meal)} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── PRICING TAB ── */}
            {activeTab === "pricing" && (
              <div className="max-w-2xl space-y-6">
                {/* Accommodation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-earth uppercase flex items-center gap-1"><Hotel className="w-3 h-3" /> Accommodation</h4>
                    <button onClick={addAccomItem}
                      className="text-xs text-gold hover:text-gold-dark flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Property
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(editing.pricing.accommodation || []).map((a: any, i: number) => (
                      <div key={i} className="p-2 bg-gray-50 space-y-1">
                        <div className="flex items-center gap-2">
                          <input type="text" value={a.label} onChange={(e) => updateAccomItem(i, { label: e.target.value })}
                            placeholder="Property name"
                            className="flex-[2] px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                          <input type="number" value={a.nights} onChange={(e) => updateAccomItem(i, { nights: parseInt(e.target.value) || 0 })}
                            placeholder="Nights"
                            className="w-16 px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                          <button onClick={() => removeAccomItem(i)}
                            className="p-1 text-earth hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-earth">
                          <span className="w-8">PPPN:</span>
                          <input type="number" value={a.ratePerNightPPPN || Math.round(a.ratePerNight / (editing.isCouple ? 2 : 1))}
                            onChange={(e) => {
                              const pppn = parseFloat(e.target.value) || 0;
                              const guestCount = editing.isCouple ? 2 : 1;
                              updateAccomItem(i, { ratePerNightPPPN: pppn, ratePerNight: pppn * guestCount });
                            }}
                            className="w-20 px-2 py-1 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                          <span className="w-10">×{editing.isCouple ? "2" : "1"} =</span>
                          <span className="font-medium text-soft-black">${((a.ratePerNightPPPN || Math.round(a.ratePerNight / (editing.isCouple ? 2 : 1))) * (editing.isCouple ? 2 : 1)).toLocaleString()}/night</span>
                          <span className="ml-auto text-[10px] text-earth/60">{a.nights} nights → </span>
                          <span className="font-semibold text-soft-black text-xs">${a.subtotal.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity Costs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-earth uppercase flex items-center gap-1"><ActivityIcon className="w-3 h-3" /> Activity Costs</h4>
                    <button onClick={addActivityCost}
                      className="text-xs text-gold hover:text-gold-dark flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Activity Cost
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(editing.pricing.activities || []).map((a, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-gray-50">
                        <input type="text" value={a.label} onChange={(e) => {
                          const newActs = [...(editing.pricing.activities || [])];
                          newActs[i] = { ...newActs[i], label: e.target.value };
                          setEditing({ ...editing, pricing: { ...editing.pricing, activities: newActs } });
                        }}
                          placeholder="Activity name"
                          className="flex-[2] px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                        <input type="number" value={a.cost} onChange={(e) => updateActivityCost(i, parseFloat(e.target.value) || 0)}
                          placeholder="Cost"
                          className="w-24 px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                        <span className="text-xs text-earth font-medium w-20 text-right">${a.cost.toLocaleString()}</span>
                        <button onClick={() => removeActivityCost(i)}
                          className="p-1 text-earth hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transfer Costs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-earth uppercase flex items-center gap-1"><Plane className="w-3 h-3" /> Transfer Costs</h4>
                    <button onClick={addTransferCost}
                      className="text-xs text-gold hover:text-gold-dark flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Transfer Cost
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(editing.pricing.transfers || []).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-gray-50">
                        <input type="text" value={t.label} onChange={(e) => {
                          const newXfers = [...(editing.pricing.transfers || [])];
                          newXfers[i] = { ...newXfers[i], label: e.target.value };
                          setEditing({ ...editing, pricing: { ...editing.pricing, transfers: newXfers } });
                        }}
                          placeholder="Transfer description"
                          className="flex-[2] px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                        <input type="number" value={t.cost} onChange={(e) => updateTransferCost(i, parseFloat(e.target.value) || 0)}
                          placeholder="Cost"
                          className="w-24 px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                        <span className="text-xs text-earth font-medium w-20 text-right">${t.cost.toLocaleString()}</span>
                        <button onClick={() => removeTransferCost(i)}
                          className="p-1 text-earth hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 pt-4 space-y-1">
                  <div className="flex justify-between text-sm text-earth">
                    <span>Subtotal</span>
                    <span>${editing.pricing.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-earth">
                    <span>Taxes (10%)</span>
                    <span>${editing.pricing.taxes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-soft-black">Total</span>
                      <input type="text" value={editing.pricing.currency}
                        onChange={(e) => setEditing({ ...editing, pricing: { ...editing.pricing, currency: e.target.value.toUpperCase() } })}
                        className="w-14 px-2 py-1 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
                    </div>
                    <span className="text-base font-bold text-soft-black">
                      ${editing.pricing.total.toLocaleString()} {editing.pricing.currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── GUEST TAB ── */}
            {activeTab === "guest" && (
              <div className="max-w-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-earth mb-1">Guest Name</label>
                    <input type="text" value={editing.guestName} onChange={(e) => setEditing({ ...editing, guestName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth mb-1">Email</label>
                    <input type="email" value={editing.guestEmail} onChange={(e) => setEditing({ ...editing, guestEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth mb-1">Phone</label>
                    <input type="text" value={editing.guestPhone} onChange={(e) => setEditing({ ...editing, guestPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editing.isCouple} onChange={(e) => setEditing({ ...editing, isCouple: e.target.checked })}
                      className="w-4 h-4 border-gray-300" />
                    <span className="text-xs text-earth">Couple</span>
                  </label>
                  {editing.specialOccasion && (
                    <span className="text-[10px] bg-pink-50 text-pink-700 px-2 py-0.5">{editing.specialOccasion}</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth mb-1">Special Occasion</label>
                  <input type="text" value={editing.specialOccasion} onChange={(e) => setEditing({ ...editing, specialOccasion: e.target.value })}
                    placeholder="e.g. Honeymoon, Anniversary"
                    className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                </div>
                <div className="bg-gray-50 p-4 space-y-1 text-xs text-earth">
                  <p>Guest Profile ID: {editing.guestProfileId || "—"}</p>
                  <p>Inquiry ID: {editing.inquiryId || "—"}</p>
                  <p>Booking ID: {editing.bookingId || "—"}</p>
                  {editing.createdAt && <p>Created: {new Date(editing.createdAt).toLocaleString()}</p>}
                  {editing.sentAt && <p>Sent: {new Date(editing.sentAt).toLocaleString()}</p>}
                  {editing.acceptedAt && <p>Accepted: {new Date(editing.acceptedAt).toLocaleString()}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── List View ── */
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-soft-black">Journey Editor</h1>
              <p className="text-sm text-earth mt-1">Manage and edit saved AI-curated itineraries.</p>
            </div>
            <p className="text-xs text-earth">{filtered.length} journey{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Search + Filter */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by guest name, email or journey title..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-sm bg-white focus:outline-none focus:border-soft-black" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 text-sm bg-white focus:outline-none focus:border-soft-black">
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="bg-white border border-gray-100 p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto mb-3" />
              <p className="text-sm text-earth">Loading journeys...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-gray-100 p-12 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-soft-black mb-2">No journeys yet</h3>
              <p className="text-sm text-earth max-w-md mx-auto">
                Saved journeys appear here after you generate and save them from the AI Journey Studio.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((j) => (
                <motion.div key={j.id} layout
                  className="bg-white border border-gray-100 p-5 cursor-pointer hover:border-soft-black/20 transition-colors"
                  onClick={() => { setSelected(j); setEditing(JSON.parse(JSON.stringify(j))); setActiveTab("details"); setActiveDay(1); }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-soft-black truncate">{j.title || "Untitled Journey"}</h3>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 ${STATUS_CONFIG[j.status]?.bg || "bg-gray-100"} ${STATUS_CONFIG[j.status]?.color || "text-gray-600"}`}>
                          {STATUS_CONFIG[j.status]?.label || j.status}
                        </span>
                      </div>
                      <p className="text-xs text-earth truncate">{j.guestName} · {j.guestEmail}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-bold text-soft-black">${(j.pricing?.total || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-earth">{j.duration} nights · v{j.version}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-earth/60">
                    {j.destinations.length > 0 && <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {j.destinations.join(", ")}</span>}
                    <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {new Date(j.createdAt).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white max-w-sm w-full p-6">
              <h3 className="text-lg font-bold text-soft-black mb-2">Delete Journey</h3>
              <p className="text-sm text-earth mb-6">Permanently delete "{editing?.title}"? This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDelete(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-sm text-earth hover:border-soft-black transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete}
                  className="flex-1 py-2.5 bg-red-600 text-cream text-sm font-medium hover:bg-red-700 transition-colors">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MealInput({ onAdd }: { onAdd: (meal: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (val.trim()) { onAdd(val); setVal(""); } }}
      className="flex gap-2">
      <input type="text" value={val} onChange={(e) => setVal(e.target.value)}
        placeholder="Add meal (e.g. Breakfast, Lunch, Dinner)..."
        className="flex-1 px-2 py-1.5 border border-gray-200 text-xs focus:outline-none focus:border-soft-black" />
      <button type="submit" disabled={!val.trim()}
        className="px-3 py-1.5 bg-soft-black text-cream text-xs font-medium hover:bg-soft-black-light transition-colors disabled:opacity-50">
        Add
      </button>
    </form>
  );
}
