"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, Phone, MapPin, User, Star, Heart, Tag, Award, Calendar, Plus, Edit2, Trash2, X, Check, AlertCircle, Loader2, Globe } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";

interface GuestProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  isCouple: boolean;
  travelStyle: string;
  accommodationStyle: string;
  activityLevel: string;
  budgetRange: string;
  dietaryRestrictions: string[];
  interests: string[];
  specialOccasion: string;
  specialOccasionDate: string;
  anniversaryDate: string;
  pastDestinations: string[];
  wishlist: string[];
  totalBookings: number;
  totalSpent: number;
  lastTripDate: string;
  lastContactedAt: string;
  source: string;
  referralSource: string;
  notes: string;
  isVip: boolean;
  emailOptIn: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

function mapProfile(item: any): GuestProfile {
  return {
    id: item.id || "",
    fullName: item.fullName || "",
    email: item.email || "",
    phone: item.phone || "",
    country: item.country || "",
    isCouple: item.isCouple ?? true,
    travelStyle: item.travelStyle || "",
    accommodationStyle: item.accommodationStyle || "",
    activityLevel: item.activityLevel || "",
    budgetRange: item.budgetRange || "",
    dietaryRestrictions: item.dietaryRestrictions || [],
    interests: item.interests || [],
    specialOccasion: item.specialOccasion || "",
    specialOccasionDate: item.specialOccasionDate || "",
    anniversaryDate: item.anniversaryDate || "",
    pastDestinations: item.pastDestinations || [],
    wishlist: item.wishlist || [],
    totalBookings: item.totalBookings || 0,
    totalSpent: item.totalSpent || 0,
    lastTripDate: item.lastTripDate || "",
    lastContactedAt: item.lastContactedAt || "",
    source: item.source || "website",
    referralSource: item.referralSource || "",
    notes: item.notes || "",
    isVip: item.isVip ?? false,
    emailOptIn: item.emailOptIn ?? true,
    tags: item.tags || [],
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
  };
}

function mapProfileToApi(item: Partial<GuestProfile>): any {
  return {
    full_name: item.fullName,
    email: item.email,
    phone: item.phone,
    country: item.country,
    is_couple: item.isCouple,
    travel_style: item.travelStyle,
    accommodation_style: item.accommodationStyle,
    activity_level: item.activityLevel,
    budget_range: item.budgetRange,
    dietary_restrictions: item.dietaryRestrictions,
    interests: item.interests,
    special_occasion: item.specialOccasion,
    special_occasion_date: item.specialOccasionDate || null,
    anniversary_date: item.anniversaryDate || null,
    past_destinations: item.pastDestinations,
    wishlist: item.wishlist,
    source: item.source,
    referral_source: item.referralSource,
    notes: item.notes,
    is_vip: item.isVip,
    email_opt_in: item.emailOptIn,
    tags: item.tags,
  };
}

const SOURCE_OPTIONS = ["website", "whatsapp", "email", "referral", "repeat"];
const TRAVEL_STYLES = ["romantic", "adventure", "relaxation", "cultural", "mixed"];
const ACCOMMODATION_STYLES = ["intimate-boutique", "luxury-resort", "eco-camp", "private-villa"];
const ACTIVITY_LEVELS = ["low", "moderate", "high"];
const BUDGET_RANGES = ["premium", "ultra-luxury"];

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");
  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 min-h-[38px] focus-within:border-soft-black">
      {values.map((v, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-earth px-1.5 py-0.5">
          {v}
          <button onClick={() => onChange(values.filter((_, j) => j !== i))} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && input.trim()) {
            e.preventDefault();
            onChange([...values, input.trim()]);
            setInput("");
          }
        }}
        className="flex-1 min-w-[80px] text-xs outline-none border-0 p-0"
        placeholder={values.length === 0 ? placeholder : ""}
      />
    </div>
  );
}

export default function AdminGuestProfiles() {
  const { data: profiles, loading, create, update, remove } = useApiData<GuestProfile>("guest-profiles", {
    mapFromApi: mapProfile,
    mapToApi: mapProfileToApi,
  });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GuestProfile | null>(null);
  const [editing, setEditing] = useState<GuestProfile | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newProfile, setNewProfile] = useState<Partial<GuestProfile>>({ fullName: "", email: "", isCouple: true, source: "website", emailOptIn: true, tags: [], interests: [], dietaryRestrictions: [], pastDestinations: [], wishlist: [] });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = profiles.filter((p) =>
    !search || p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.toLowerCase().includes(search.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const vips = filtered.filter(p => p.isVip);
  const regulars = filtered.filter(p => !p.isVip);

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const result = await update(editing.id, editing);
    if (result) {
      setSelected(result);
      setEditing(null);
      showToast("Profile updated", "success");
    } else {
      showToast("Failed to update profile", "error");
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!newProfile.fullName || !newProfile.email) return;
    setSaving(true);
    const result = await create(newProfile);
    if (result) {
      setShowCreate(false);
      setNewProfile({ fullName: "", email: "", isCouple: true, source: "website", emailOptIn: true, tags: [], interests: [], dietaryRestrictions: [], pastDestinations: [], wishlist: [] });
      showToast("Profile created", "success");
    } else {
      showToast("Failed to create profile", "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this guest profile? This cannot be undone.")) return;
    const ok = await remove(id);
    if (ok) {
      if (selected?.id === id) setSelected(null);
      showToast("Profile deleted", "success");
    } else {
      showToast("Failed to delete profile", "error");
    }
  };

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 text-sm flex items-center gap-2 ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Guest Profiles</h1>
          <p className="text-sm text-earth mt-1">Centralised guest records linked to journeys and bookings.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black-light transition-colors">
          <Plus className="w-4 h-4" /> New Profile
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone or tag..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-sm bg-white focus:outline-none focus:border-soft-black" />
      </div>

      {loading ? (
        <div className="bg-white border border-gray-100 p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto mb-3" />
          <p className="text-sm text-earth">Loading profiles...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 p-12 text-center">
          <User className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-soft-black mb-2">No guest profiles yet</h3>
          <p className="text-sm text-earth max-w-md mx-auto">
            Guest profiles are automatically created when you save a journey or complete a booking.
            Click &quot;New Profile&quot; to create one manually.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* VIP Section */}
          {vips.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-earth uppercase tracking-wider mb-3 flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-gold" /> VIP Guests ({vips.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {vips.map((p) => <ProfileCard key={p.id} profile={p} onClick={() => setSelected(p)} onDelete={handleDelete} />)}
              </div>
            </div>
          )}

          {/* All Profiles */}
          <div>
            <h3 className="text-xs font-semibold text-earth uppercase tracking-wider mb-3">
              {vips.length > 0 ? "All Guests" : `Guest Profiles (${filtered.length})`}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {regulars.map((p) => <ProfileCard key={p.id} profile={p} onClick={() => setSelected(p)} onDelete={handleDelete} />)}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white max-w-lg w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-lg font-bold text-soft-black">New Guest Profile</h2>
                <button onClick={() => setShowCreate(false)} className="text-earth hover:text-soft-black"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-earth mb-1">Full Name *</label>
                    <input type="text" value={newProfile.fullName} onChange={(e) => setNewProfile({ ...newProfile, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-earth mb-1">Email *</label>
                    <input type="email" value={newProfile.email} onChange={(e) => setNewProfile({ ...newProfile, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth mb-1">Phone</label>
                    <input type="text" value={newProfile.phone || ""} onChange={(e) => setNewProfile({ ...newProfile, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth mb-1">Country</label>
                    <input type="text" value={newProfile.country || ""} onChange={(e) => setNewProfile({ ...newProfile, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="newIsCouple" checked={newProfile.isCouple}
                    onChange={(e) => setNewProfile({ ...newProfile, isCouple: e.target.checked })}
                    className="w-4 h-4 border-gray-300" />
                  <label htmlFor="newIsCouple" className="text-xs text-earth">Couple</label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth mb-1">Source</label>
                  <select value={newProfile.source} onChange={(e) => setNewProfile({ ...newProfile, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black">
                    {SOURCE_OPTIONS.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="newVip" checked={newProfile.isVip}
                    onChange={(e) => setNewProfile({ ...newProfile, isVip: e.target.checked })}
                    className="w-4 h-4 border-gray-300" />
                  <label htmlFor="newVip" className="text-xs text-earth">VIP Guest</label>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
                <button onClick={handleCreate} disabled={saving || !newProfile.fullName || !newProfile.email}
                  className="w-full py-3 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Create Profile"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Slide-over */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 z-50" onClick={() => { setSelected(null); setEditing(null); }}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              
              {!editing ? (
                <>
                  {/* View Mode */}
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-soft-black">Guest Profile</h2>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditing(selected)} className="p-2 text-earth hover:text-soft-black"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => { setSelected(null); setEditing(null); }} className="p-2 text-earth hover:text-soft-black"><X className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-soft-black/5 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-soft-black/30" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-soft-black flex items-center gap-2">
                          {selected.fullName}
                          {selected.isVip && <Star className="w-4 h-4 text-gold fill-gold" />}
                        </h3>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-earth">
                          {selected.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selected.email}</span>}
                          {selected.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selected.phone}</span>}
                          {selected.country && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {selected.country}</span>}
                        </div>
                        {selected.isCouple && <span className="inline-block mt-1 text-[10px] bg-gold/10 text-gold-dark px-1.5 py-0.5">Couple</span>}
                      </div>
                    </div>

                    {selected.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.tags.map((t, i) => (
                          <span key={i} className="text-[10px] bg-gray-100 text-earth px-2 py-0.5 flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> {t}</span>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selected.travelStyle && <div><span className="text-[10px] text-earth uppercase block">Travel Style</span><span className="text-soft-black">{selected.travelStyle}</span></div>}
                      {selected.accommodationStyle && <div><span className="text-[10px] text-earth uppercase block">Accommodation</span><span className="text-soft-black">{selected.accommodationStyle}</span></div>}
                      {selected.activityLevel && <div><span className="text-[10px] text-earth uppercase block">Activity Level</span><span className="text-soft-black">{selected.activityLevel}</span></div>}
                      {selected.budgetRange && <div><span className="text-[10px] text-earth uppercase block">Budget</span><span className="text-soft-black">{selected.budgetRange}</span></div>}
                    </div>

                    {selected.specialOccasion && (
                      <div className="bg-gold/5 p-3 border border-gold/10">
                        <p className="text-xs font-medium text-gold-dark flex items-center gap-1"><Heart className="w-3 h-3" /> {selected.specialOccasion}{selected.specialOccasionDate ? ` — ${selected.specialOccasionDate}` : ""}</p>
                      </div>
                    )}

                    {selected.interests.length > 0 && (
                      <div>
                        <p className="text-[10px] text-earth uppercase mb-1.5">Interests</p>
                        <div className="flex flex-wrap gap-1">{selected.interests.map((i, j) => <span key={j} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5">{i}</span>)}</div>
                      </div>
                    )}
                    {selected.dietaryRestrictions.length > 0 && (
                      <div>
                        <p className="text-[10px] text-earth uppercase mb-1.5">Dietary</p>
                        <div className="flex flex-wrap gap-1">{selected.dietaryRestrictions.map((d, j) => <span key={j} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5">{d}</span>)}</div>
                      </div>
                    )}

                    {selected.pastDestinations.length > 0 && (
                      <div>
                        <p className="text-[10px] text-earth uppercase mb-1.5">Past Destinations</p>
                        <div className="flex flex-wrap gap-1">{selected.pastDestinations.map((d, j) => <span key={j} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5">{d}</span>)}</div>
                      </div>
                    )}
                    {selected.wishlist.length > 0 && (
                      <div>
                        <p className="text-[10px] text-earth uppercase mb-1.5">Wishlist</p>
                        <div className="flex flex-wrap gap-1">{selected.wishlist.map((w, j) => <span key={j} className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5">{w}</span>)}</div>
                      </div>
                    )}

                    {selected.notes && (
                      <div>
                        <p className="text-[10px] text-earth uppercase mb-1">Notes</p>
                        <p className="text-sm text-soft-black bg-gray-50 p-3">{selected.notes}</p>
                      </div>
                    )}

                    <div className="text-xs text-earth/60 space-y-1 pt-4 border-t border-gray-100">
                      <p>Source: {selected.source}{selected.referralSource ? ` (${selected.referralSource})` : ""}</p>
                      <p>Bookings: {selected.totalBookings} | Spent: ${selected.totalSpent.toLocaleString()}</p>
                      {selected.lastTripDate && <p>Last trip: {selected.lastTripDate}</p>}
                      {selected.createdAt && <p>Guest since: {new Date(selected.createdAt).toLocaleDateString()}</p>}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Edit Mode */}
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-soft-black">Edit Profile</h2>
                    <button onClick={() => setEditing(null)} className="p-2 text-earth hover:text-soft-black"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-earth mb-1">Full Name</label>
                        <input type="text" value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-earth mb-1">Email</label>
                        <input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-earth mb-1">Phone</label>
                        <input type="text" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-earth mb-1">Country</label>
                        <input type="text" value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={editing.isCouple} onChange={(e) => setEditing({ ...editing, isCouple: e.target.checked })}
                          className="w-4 h-4 border-gray-300" />
                        <span className="text-xs text-earth">Couple</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={editing.isVip} onChange={(e) => setEditing({ ...editing, isVip: e.target.checked })}
                          className="w-4 h-4 border-gray-300" />
                        <span className="text-xs text-earth flex items-center gap-1"><Star className="w-3 h-3 text-gold" /> VIP</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={editing.emailOptIn} onChange={(e) => setEditing({ ...editing, emailOptIn: e.target.checked })}
                          className="w-4 h-4 border-gray-300" />
                        <span className="text-xs text-earth">Email Opt-in</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-earth mb-1">Travel Style</label>
                      <select value={editing.travelStyle} onChange={(e) => setEditing({ ...editing, travelStyle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black">
                        <option value="">Select...</option>
                        {TRAVEL_STYLES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-earth mb-1">Accommodation Style</label>
                        <select value={editing.accommodationStyle} onChange={(e) => setEditing({ ...editing, accommodationStyle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black">
                          <option value="">Select...</option>
                          {ACCOMMODATION_STYLES.map((s) => <option key={s} value={s}>{s.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-earth mb-1">Activity Level</label>
                        <select value={editing.activityLevel} onChange={(e) => setEditing({ ...editing, activityLevel: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black">
                          <option value="">Select...</option>
                          {ACTIVITY_LEVELS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-earth mb-1">Budget Range</label>
                      <select value={editing.budgetRange} onChange={(e) => setEditing({ ...editing, budgetRange: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black">
                        <option value="">Select...</option>
                        {BUDGET_RANGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-earth mb-1">Special Occasion</label>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={editing.specialOccasion} onChange={(e) => setEditing({ ...editing, specialOccasion: e.target.value })}
                          placeholder="e.g. Honeymoon" className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                        <input type="date" value={editing.specialOccasionDate} onChange={(e) => setEditing({ ...editing, specialOccasionDate: e.target.value })}
                          className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-earth mb-1">Anniversary Date</label>
                      <input type="date" value={editing.anniversaryDate} onChange={(e) => setEditing({ ...editing, anniversaryDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-earth mb-1">Tags</label>
                      <TagInput values={editing.tags} onChange={(v) => setEditing({ ...editing, tags: v })} placeholder="Add tag..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-earth mb-1">Interests</label>
                      <TagInput values={editing.interests} onChange={(v) => setEditing({ ...editing, interests: v })} placeholder="Add interest..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-earth mb-1">Dietary Restrictions</label>
                      <TagInput values={editing.dietaryRestrictions} onChange={(v) => setEditing({ ...editing, dietaryRestrictions: v })} placeholder="Add restriction..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-earth mb-1">Past Destinations</label>
                      <TagInput values={editing.pastDestinations} onChange={(v) => setEditing({ ...editing, pastDestinations: v })} placeholder="Add destination..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-earth mb-1">Wishlist Destinations</label>
                      <TagInput values={editing.wishlist} onChange={(v) => setEditing({ ...editing, wishlist: v })} placeholder="Add destination..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-earth mb-1">Source</label>
                      <div className="grid grid-cols-2 gap-4">
                        <select value={editing.source} onChange={(e) => setEditing({ ...editing, source: e.target.value })}
                          className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black">
                          {SOURCE_OPTIONS.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                        </select>
                        <input type="text" value={editing.referralSource} onChange={(e) => setEditing({ ...editing, referralSource: e.target.value })}
                          placeholder="Referral source" className="px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-earth mb-1">Notes</label>
                      <textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                        rows={3} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-soft-black" />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={handleSaveEdit} disabled={saving}
                        className="flex-1 py-3 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Check className="w-4 h-4" /> Save Changes</>}
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="px-6 py-3 border border-gray-200 text-sm text-earth hover:border-soft-black transition-colors">Cancel</button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileCard({ profile, onClick, onDelete }: { profile: GuestProfile; onClick: () => void; onDelete: (id: string) => void }) {
  return (
    <motion.div
      className="bg-white border border-gray-100 p-5 cursor-pointer hover:border-soft-black/20 transition-colors group"
      onClick={onClick}
      layout
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-soft-black/5 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-soft-black/30" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-soft-black flex items-center gap-1.5">
              {profile.fullName}
              {profile.isVip && <Star className="w-3 h-3 text-gold fill-gold" />}
            </h4>
            <p className="text-xs text-earth truncate max-w-[180px]">{profile.email}</p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(profile.id); }}
          className="opacity-0 group-hover:opacity-100 p-1 text-earth hover:text-red-500 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {profile.isCouple && <span className="text-[10px] bg-gold/10 text-gold-dark px-1.5 py-0.5">Couple</span>}
        {profile.specialOccasion && <span className="text-[10px] bg-pink-50 text-pink-700 px-1.5 py-0.5">{profile.specialOccasion}</span>}
        {profile.tags.slice(0, 3).map((t, i) => (
          <span key={i} className="text-[10px] bg-gray-100 text-earth px-1.5 py-0.5">{t}</span>
        ))}
        {profile.tags.length > 3 && <span className="text-[10px] text-earth">+{profile.tags.length - 3}</span>}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-earth/60">
        {profile.phone && <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> {profile.phone}</span>}
        {profile.totalBookings > 0 && <span>{profile.totalBookings} booking{profile.totalBookings !== 1 ? "s" : ""}</span>}
      </div>
    </motion.div>
  );
}
