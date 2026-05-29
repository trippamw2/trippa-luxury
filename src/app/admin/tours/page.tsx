"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit2, Trash2, X, Clock, MapPin, Users, Star, Copy, Image as ImageIcon, Calendar, Compass } from "lucide-react";
import Image from "next/image";
import { formatDestination } from "@/lib/utils";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { SkeletonText } from "@/app/admin/components/Skeleton";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { FormInput, FormTextarea, FormSelect, FormGroup } from "@/app/admin/components/FormField";
import { RichTextEditor } from "@/app/admin/components/RichTextEditor";
import { ImageUpload } from "@/app/admin/components/ImageUpload";

interface ItineraryDay {
  day: number;
  title: string;
  description: string;
  activities: string[];
  meals: string[];
  accommodation?: string;
}

interface Tour {
  id: string;
  title: string;
  category: string;
  destination: string;
  durationDays: number;
  pricingFrom: number;
  currency: string;
  status: "active" | "draft" | "archived";
  bookings: number;
  rating: number;
  featured: boolean;
  description?: string;
  image?: string;
  itinerary?: ItineraryDay[];
  inclusions?: string[];
  exclusions?: string[];
  meetingPoint?: string;
  groupSize?: string;
  languages?: string[];
}

function mapTour(item: any): Tour {
  return {
    id: item.id,
    title: item.title || "",
    category: item.category || "Safari",
    destination: item.destination || "lake-malawi",
    durationDays: item.durationDays || 1,
    pricingFrom: item.pricingFrom || 0,
    currency: item.currency || "USD",
    status: item.isActive === false ? "archived" : (item.isActive ? "active" : "draft"),
    bookings: item.bookings || 0,
    rating: item.rating || 0,
    featured: item.isFeatured || false,
    description: item.description || "",
    image: item.heroImage || item.image || "",
    itinerary: item.itinerary || [],
    inclusions: item.included || [],
    exclusions: item.excluded || [],
    meetingPoint: item.meetingPoint || "",
    groupSize: item.groupSize || "",
    languages: item.languages || [],
  };
}

function mapTourToApi(item: Partial<Tour>): any {
  return {
    title: item.title,
    category: item.category,
    destination: item.destination,
    duration_days: item.durationDays,
    pricing_from: item.pricingFrom,
    currency: item.currency,
    is_active: item.status === "active",
    is_featured: item.featured,
    description: item.description,
    hero_image: item.image,
    included: item.inclusions,
    excluded: item.exclusions,
  };
}

const categoryColors: Record<string, string> = {
  Safari: "bg-amber-50 text-amber-700 border-amber-200",
  Romance: "bg-rose-50 text-rose-700 border-rose-200",
  Cultural: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Wellness: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Adventure: "bg-blue-50 text-blue-700 border-blue-200",
  Dining: "bg-orange-50 text-orange-700 border-orange-200",
};

const CATEGORIES = ["Safari", "Romance", "Cultural", "Wellness", "Adventure", "Dining"];

const DEFAULT_ITINERARY: ItineraryDay = {
  day: 1, title: "", description: "", activities: [], meals: [], accommodation: ""
};

export default function AdminTours() {
  const { data: tours, loading, create, update, remove } = useApiData<Tour>("tours", {
    mapFromApi: mapTour,
    mapToApi: mapTourToApi,
  });
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "", category: "Safari", destination: "lake-malawi",
    durationDays: "1", pricingFrom: "", status: "draft" as "active" | "draft" | "archived",
    featured: false, description: "", image: "",
    itinerary: [{ ...DEFAULT_ITINERARY }] as ItineraryDay[],
    inclusions: "", exclusions: "", meetingPoint: "", groupSize: ""
  });

  const filteredTours = tours.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormData({ title: "", category: "Safari", destination: "lake-malawi", durationDays: "1", pricingFrom: "", status: "draft", featured: false, description: "", image: "", itinerary: [{ ...DEFAULT_ITINERARY }], inclusions: "", exclusions: "", meetingPoint: "", groupSize: "" });
  };

  const handleAdd = async () => {
    const result = await create({
      title: formData.title, category: formData.category, destination: formData.destination,
      durationDays: parseInt(formData.durationDays) || 1, pricingFrom: parseInt(formData.pricingFrom) || 0,
      status: formData.status, featured: formData.featured, description: formData.description,
      image: formData.image || "/images/lrc-walking.jpg",
      itinerary: formData.itinerary.filter(i => i.title),
      inclusions: formData.inclusions.split(",").map(i => i.trim()).filter(Boolean),
      exclusions: formData.exclusions.split(",").map(e => e.trim()).filter(Boolean),
    });
    if (result) {
      setShowModal(false);
      resetForm();
      toast("Tour created successfully", "success");
    } else {
      toast("Failed to create tour", "error");
    }
  };

  const handleEdit = async () => {
    if (!editingTour) return;
    const result = await update(editingTour.id, {
      ...editingTour,
      title: formData.title, category: formData.category, destination: formData.destination,
      durationDays: parseInt(formData.durationDays) || 1, pricingFrom: parseInt(formData.pricingFrom) || 0,
      status: formData.status, featured: formData.featured, description: formData.description,
      image: formData.image || "/images/lrc-walking.jpg",
      itinerary: formData.itinerary.filter(i => i.title),
      inclusions: formData.inclusions.split(",").map(i => i.trim()).filter(Boolean),
      exclusions: formData.exclusions.split(",").map(e => e.trim()).filter(Boolean),
    });
    if (result) {
      setEditingTour(null);
      setShowModal(false);
      resetForm();
      toast("Tour updated successfully", "success");
    } else {
      toast("Failed to update tour", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      toast("Tour deleted", "success");
    } else {
      toast("Failed to delete tour", "error");
    }
  };

  const handleDuplicate = async (tour: Tour) => {
    await create({ ...tour, title: `${tour.title} (Copy)`, bookings: 0, rating: 0, status: "draft" as const });
    toast("Tour duplicated", "success");
  };

  const openEditModal = (tour: Tour) => {
    setEditingTour(tour);
    setFormData({
      title: tour.title, category: tour.category, destination: tour.destination,
      durationDays: tour.durationDays.toString(), pricingFrom: tour.pricingFrom.toString(),
      status: tour.status, featured: tour.featured, description: tour.description || "",
      image: tour.image || "",
      itinerary: tour.itinerary?.length ? tour.itinerary : [{ ...DEFAULT_ITINERARY }],
      inclusions: tour.inclusions?.join(", ") || "",
      exclusions: tour.exclusions?.join(", ") || "",
      meetingPoint: tour.meetingPoint || "",
      groupSize: tour.groupSize || ""
    });
    setShowModal(true);
  };

  const openAddModal = () => { setEditingTour(null); resetForm(); setShowModal(true); };

  const addItineraryDay = () => {
    setFormData({ ...formData, itinerary: [...formData.itinerary, { ...DEFAULT_ITINERARY, day: formData.itinerary.length + 1 }] });
  };

  const updateItineraryDay = (index: number, field: keyof ItineraryDay, value: any) => {
    const updated = [...formData.itinerary];
    (updated[index] as any)[field] = value;
    setFormData({ ...formData, itinerary: updated });
  };

  const removeItineraryDay = (index: number) => {
    if (formData.itinerary.length > 1) {
      setFormData({ ...formData, itinerary: formData.itinerary.filter((_, i) => i !== index) });
    }
  };

  const stats = {
    total: tours.length, active: tours.filter(t => t.status === "active").length,
    drafts: tours.filter(t => t.status === "draft").length, featured: tours.filter(t => t.featured).length,
  };

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Tours & Experiences</h1><p className="text-earth mt-1">Create and manage tours, activities, and experiences</p></div>
        <button onClick={openAddModal} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all"><Plus className="w-4 h-4" />New Tour</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{ label: "Total Tours", value: stats.total, color: "text-soft-black" }, { label: "Active", value: stats.active, color: "text-emerald-600" }, { label: "Draft", value: stats.drafts, color: "text-earth" }, { label: "Featured", value: stats.featured, color: "text-gold" }].map(stat => (
          <div key={stat.label} className="bg-white border border-sand-light p-4"><p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p><p className="text-xs text-earth">{stat.label}</p></div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1"><input type="text" placeholder="Search tours..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"><option value="all">All Status</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-sand-light overflow-hidden">
              <div className="aspect-video bg-sand-light" />
              <div className="p-4 space-y-2"><SkeletonText className="w-1/3" /><SkeletonText className="w-2/3" /><SkeletonText className="w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : filteredTours.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No tours yet"
          description={searchQuery || statusFilter !== "all" ? "No tours match your filters." : "Create your first tour to get started."}
          action={!searchQuery && statusFilter === "all" ? { label: "New Tour", onClick: openAddModal } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTours.map((tour, index) => (
            <motion.div key={tour.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
              className="bg-white border border-sand-light overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="relative aspect-video bg-cream">
                {tour.image ? <Image src={tour.image} alt={tour.title} fill unoptimized className="object-cover" /> : <div className="flex items-center justify-center h-full"><ImageIcon className="w-8 h-8 text-earth" /></div>}
                {tour.featured && <div className="absolute top-2 left-2"><Star className="w-4 h-4 text-gold fill-gold" /></div>}
                <div className="absolute top-2 right-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${tour.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : tour.status === "draft" ? "bg-sand-light text-earth border-sand" : "bg-gray-100 text-gray-400 border-gray-200"}`}>{tour.status}</span>
                </div>
              </div>
              <div className="p-4">
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${categoryColors[tour.category] || "bg-gray-50 text-gray-600 border-gray-200"}`}>{tour.category}</span>
                <h3 className="text-base font-semibold text-soft-black mb-1 mt-2 line-clamp-1">{tour.title}</h3>
                <p className="text-xs text-earth flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{formatDestination(tour.destination)}</p>
                {tour.itinerary && tour.itinerary.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-earth bg-cream px-2 py-1 mb-3"><Calendar className="w-3 h-3" />{tour.itinerary.length} day{tour.itinerary.length > 1 ? "s" : ""}</div>
                )}
                <div className="flex items-center gap-4 text-xs text-earth mb-3">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tour.durationDays} {tour.durationDays === 1 ? "day" : "days"}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{tour.bookings}</span>
                  {tour.rating > 0 && <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-gold text-gold" />{tour.rating}</span>}
                </div>
                <div className="pt-3 border-t border-sand-light">
                  <span className="text-sm font-semibold text-soft-black">${tour.pricingFrom.toLocaleString()}<span className="text-xs text-earth font-normal"> /person</span></span>
                </div>
              </div>
              <div className="px-4 py-3 bg-warm-white flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleDuplicate(tour)} className="text-xs text-gold hover:text-gold-dark flex items-center gap-1"><Copy className="w-3 h-3" /> Duplicate</button>
                  <button onClick={() => openEditModal(tour)} className="text-xs text-gold hover:text-gold-dark flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
                </div>
                <button onClick={() => setDeleteConfirm(tour.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h2 className="text-xl font-bold text-soft-black">{editingTour ? "Edit Tour" : "Create New Tour"}</h2>
                <button onClick={() => setShowModal(false)} className="text-earth hover:text-soft-black"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                <ImageUpload label="Tour Image" value={formData.image} onChange={(url) => setFormData({ ...formData, image: url })} />
                <FormInput label="Tour Name" name="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Walking Safari Adventure" required />
                <FormGroup>
                  <FormSelect label="Category" name="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
                  <FormSelect label="Destination" name="destination" value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} options={[{ value: "lake-malawi", label: "Lake Malawi" }, { value: "south-luangwa", label: "South Luangwa" }, { value: "zanzibar", label: "Zanzibar" }]} />
                </FormGroup>
                <RichTextEditor label="Description" value={formData.description} onChange={(html) => setFormData({ ...formData, description: html })} minH="200px" placeholder="Describe the tour experience..." />
                <FormGroup>
                  <FormInput label="Duration (days)" name="durationDays" type="number" value={formData.durationDays} onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })} />
                  <FormInput label="Price (USD)" name="pricingFrom" type="number" value={formData.pricingFrom} onChange={(e) => setFormData({ ...formData, pricingFrom: e.target.value })} placeholder="350" />
                  <FormInput label="Group Size" name="groupSize" value={formData.groupSize} onChange={(e) => setFormData({ ...formData, groupSize: e.target.value })} placeholder="2-8 guests" />
                </FormGroup>
                <FormGroup>
                  <FormSelect label="Status" name="status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "draft" | "archived" })} options={[{ value: "draft", label: "Draft" }, { value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} />
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.featured} onChange={(e) => setFormData({ ...formData, featured: e.target.checked })} className="w-4 h-4 accent-gold" />
                      <span className="text-sm text-earth">Featured Tour</span>
                    </label>
                  </div>
                </FormGroup>
                <FormInput label="Meeting Point" name="meetingPoint" value={formData.meetingPoint} onChange={(e) => setFormData({ ...formData, meetingPoint: e.target.value })} placeholder="Mfuwe Airport or Hotel lobby" />

                {/* Itinerary */}
                <div className="border-t border-sand-light pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-earth uppercase tracking-wider">Itinerary</span>
                    <button type="button" onClick={addItineraryDay} className="text-xs text-gold hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Day</button>
                  </div>
                  {formData.itinerary.map((day, idx) => (
                    <div key={idx} className="bg-white border border-sand-light p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-soft-black">Day {day.day}</span>
                        {formData.itinerary.length > 1 && (<button type="button" onClick={() => removeItineraryDay(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>)}
                      </div>
                      <div className="space-y-3">
                        <input type="text" value={day.title} onChange={(e) => updateItineraryDay(idx, "title", e.target.value)} className="w-full px-3 py-2 border border-sand-light text-sm" placeholder="Day title" />
                        <textarea value={day.description} onChange={(e) => updateItineraryDay(idx, "description", e.target.value)} className="w-full px-3 py-2 border border-sand-light text-sm" rows={2} placeholder="Description" />
                        <input type="text" value={day.activities?.join(", ")} onChange={(e) => updateItineraryDay(idx, "activities", e.target.value.split(", ").filter(Boolean))} className="w-full px-3 py-2 border border-sand-light text-sm" placeholder="Activities (comma separated)" />
                        <input type="text" value={day.meals?.join(", ")} onChange={(e) => updateItineraryDay(idx, "meals", e.target.value.split(", ").filter(Boolean))} className="w-full px-3 py-2 border border-sand-light text-sm" placeholder="Meals included" />
                        <input type="text" value={day.accommodation || ""} onChange={(e) => updateItineraryDay(idx, "accommodation", e.target.value)} className="w-full px-3 py-2 border border-sand-light text-sm" placeholder="Overnight accommodation" />
                      </div>
                    </div>
                  ))}
                </div>

                <FormGroup>
                  <FormTextarea label="Inclusions (comma separated)" name="inclusions" value={formData.inclusions} onChange={(e) => setFormData({ ...formData, inclusions: e.target.value })} rows={2} placeholder="All meals, Park fees, Guide" />
                  <FormTextarea label="Exclusions (comma separated)" name="exclusions" value={formData.exclusions} onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })} rows={2} placeholder="Flights, Travel insurance" />
                </FormGroup>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={editingTour ? handleEdit : handleAdd} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">{editingTour ? "Save Changes" : "Create Tour"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation ────────────────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Confirm Delete</h3>
              <p className="text-sm text-earth mb-6">Are you sure you want to delete this tour?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
