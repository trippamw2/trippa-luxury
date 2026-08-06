"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Search, MapPin, Star, ChevronDown, ChevronRight } from "lucide-react";
import { formatDestination } from "@/lib/utils";
import Image from "next/image";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { RichTextEditor } from "@/app/admin/components/RichTextEditor";
import { ImageUpload } from "@/app/admin/components/ImageUpload";
import { ImportCsv } from "@/app/admin/components/ImportCsv";
import { Download } from "lucide-react";
import { exportToCsv } from "@/lib/csv-export";

interface Room {
  name: string;
  description: string;
  images: string[];
  sleeps: number;
}

interface Review {
  name: string;
  text: string;
  location: string;
}

interface Property {
  id: string;
  slug: string;
  name: string;
  destination: string;
  location: string;
  tagline: string;
  description: string;
  longDescription: string;
  priceRange: string;
  rating: number;
  heroImage: string;
  gallery: string[];
  roomTypes: string[];
  rooms: Room[];
  amenities: string[];
  romanticHighlights: string[];
  awards: string[];
  reviews: Review[];
  isFeatured: boolean;
  isActive: boolean;
}

const DEFAULT_FORM = {
  name: "", destination: "lake-malawi", location: "", tagline: "", description: "", longDescription: "",
  priceRange: "", rating: "4.5", heroImage: "", gallery: [] as string[],
  roomTypes: [] as string[], rooms: [] as Room[],
  amenities: [] as string[], romanticHighlights: [] as string[], awards: [] as string[],
  reviews: [] as Review[], isFeatured: false, isActive: true,
};

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface ApiProperty {
  id: string;
  slug?: string;
  name?: string;
  destination?: string;
  location?: string;
  tagline?: string;
  description?: string;
  longDescription?: string;
  priceRange?: string;
  rating?: number;
  heroImage?: string;
  gallery?: string[];
  roomTypes?: string[];
  rooms?: Room[];
  amenities?: string[];
  romanticHighlights?: string[];
  awards?: string[];
  reviews?: Review[];
  isFeatured?: boolean;
  isActive?: boolean;
}

function TagInput({ label, value, onChange, placeholder }: {
  label: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) { onChange([...value, trimmed]); setInput(""); }
  };
  return (
    <div>
      <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">{label}</label>
      <div className="flex gap-2 mb-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="flex-1 px-3 py-2 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"
          placeholder={placeholder || `Add ${label.toLowerCase()}...`} />
        <button type="button" onClick={add} className="px-3 py-2 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark">Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-warm-white border border-sand-light text-xs text-soft-black">
            {item}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-earth hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
    </div>
  );
}

function GalleryInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed) { onChange([...value, trimmed]); setInput(""); }
  };
  return (
    <div>
      <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Gallery Images</label>
      <div className="flex gap-2 mb-3">
        <input type="url" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="flex-1 px-3 py-2 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"
          placeholder="/images/kaya-mawa-beach-swing.jpg" />
        <button type="button" onClick={add} className="px-3 py-2 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark">Add</button>
      </div>
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url, i) => (
            <div key={i} className="relative group aspect-[4/3] bg-warm-white border border-sand-light overflow-hidden">
              <Image src={url} alt="" fill className="object-cover" unoptimized onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <X className="w-3 h-3" />
              </button>
              <span className="absolute bottom-0 left-0 right-0 bg-soft-black/60 text-white text-[10px] px-1 py-0.5 truncate">{i + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoomsEditor({ value, onChange }: { value: Room[]; onChange: (v: Room[]) => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const addRoom = () => {
    onChange([...value, { name: "", description: "", images: [], sleeps: 2 }]);
    setExpanded(value.length);
  };
  const updateRoom = (idx: number, field: keyof Room, val: string | number | string[]) => {
    const updated = value.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    onChange(updated);
  };
  const removeRoom = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
    if (expanded === idx) setExpanded(null);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-earth uppercase tracking-wider">Rooms / Suites</label>
        <button type="button" onClick={addRoom} className="text-xs text-gold hover:text-gold-dark font-medium">+ Add Room</button>
      </div>
      {value.length === 0 && <p className="text-xs text-earth italic">No rooms added yet.</p>}
      <div className="space-y-2">
        {value.map((room, idx) => (
          <div key={idx} className="border border-sand-light bg-white">
            <button type="button" onClick={() => setExpanded(expanded === idx ? null : idx)}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-warm-white">
              <span className="text-sm font-medium text-soft-black">{room.name || `Room ${idx + 1}`}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-earth">{room.sleeps} sleeps</span>
                {expanded === idx ? <ChevronDown className="w-4 h-4 text-earth" /> : <ChevronRight className="w-4 h-4 text-earth" />}
              </div>
            </button>
            {expanded === idx && (
              <div className="px-3 pb-3 space-y-3 border-t border-sand-light pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-earth uppercase mb-1">Room Name</label>
                    <input type="text" value={room.name} onChange={e => updateRoom(idx, "name", e.target.value)}
                      className="w-full px-3 py-2 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-earth uppercase mb-1">Sleeps</label>
                    <input type="number" min={1} max={10} value={room.sleeps} onChange={e => updateRoom(idx, "sleeps", parseInt(e.target.value) || 2)}
                      className="w-full px-3 py-2 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-earth uppercase mb-1">Description</label>
                  <textarea value={room.description} onChange={e => updateRoom(idx, "description", e.target.value)}
                    className="w-full px-3 py-2 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50" rows={2} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-earth uppercase mb-1">Images (one URL per line)</label>
                  <textarea value={room.images.join("\n")} onChange={e => updateRoom(idx, "images", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
                    className="w-full px-3 py-2 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50" rows={2} placeholder="/images/kaya-mawa-beach-swing.jpg" />
                </div>
                <button type="button" onClick={() => removeRoom(idx)} className="text-xs text-red-500 hover:text-red-700">Remove room</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsEditor({ value, onChange }: { value: Review[]; onChange: (v: Review[]) => void }) {
  const addReview = () => onChange([...value, { name: "", text: "", location: "" }]);
  const updateReview = (idx: number, field: keyof Review, val: string) => {
    onChange(value.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };
  const removeReview = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-earth uppercase tracking-wider">Reviews / Testimonials</label>
        <button type="button" onClick={addReview} className="text-xs text-gold hover:text-gold-dark font-medium">+ Add Review</button>
      </div>
      {value.length === 0 && <p className="text-xs text-earth italic">No reviews added yet.</p>}
      <div className="space-y-3">
        {value.map((review, idx) => (
          <div key={idx} className="border border-sand-light bg-white p-3 space-y-2">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-soft-black">Review #{idx + 1}</span>
              <button type="button" onClick={() => removeReview(idx)} className="text-xs text-red-500">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={review.name} onChange={e => updateReview(idx, "name", e.target.value)}
                className="px-3 py-2 border border-sand-light text-sm bg-cream/50" placeholder="Guest name" />
              <input type="text" value={review.location} onChange={e => updateReview(idx, "location", e.target.value)}
                className="px-3 py-2 border border-sand-light text-sm bg-cream/50" placeholder="Location" />
            </div>
            <textarea value={review.text} onChange={e => updateReview(idx, "text", e.target.value)}
              className="w-full px-3 py-2 border border-sand-light text-sm bg-cream/50" rows={2} placeholder="Review text..." />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminProperties() {
  const { data: properties, loading, create, update, remove } = useApiData("properties", {
    mapFromApi: (item: ApiProperty) => ({
      id: item.id,
      slug: item.slug || "",
      name: item.name ?? "",
      destination: item.destination || "lake-malawi",
      location: item.location || "",
      tagline: item.tagline || "",
      description: item.description || "",
      longDescription: item.longDescription || "",
      priceRange: item.priceRange || "",
      rating: item.rating || 0,
      heroImage: item.heroImage || "",
      gallery: item.gallery || [],
      roomTypes: item.roomTypes || [],
      rooms: item.rooms || [],
      amenities: item.amenities || [],
      romanticHighlights: item.romanticHighlights || [],
      awards: item.awards || [],
      reviews: item.reviews || [],
      isFeatured: item.isFeatured ?? false,
      isActive: item.isActive ?? true,
    }),
    mapToApi: (item: Partial<Property>) => ({
      slug: item.slug || slugify(item.name ?? ""),
      name: item.name,
      destination: item.destination,
      location: item.location,
      tagline: item.tagline,
      description: item.description,
      longDescription: item.longDescription,
      priceRange: item.priceRange,
      rating: item.rating ? Number(item.rating) : 0,
      heroImage: item.heroImage,
      gallery: item.gallery || [],
      roomTypes: item.roomTypes || [],
      rooms: item.rooms || [],
      amenities: item.amenities || [],
      romanticHighlights: item.romanticHighlights || [],
      awards: item.awards || [],
      reviews: item.reviews || [],
      isFeatured: !!item.isFeatured,
      isActive: item.isActive !== false,
    }),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState("basic");

  const { toast } = useToast();

  const filtered = properties.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => setFormData(DEFAULT_FORM);

  const populateForm = (p: Property) => {
    setFormData({
      name: p.name,
      destination: p.destination,
      location: p.location,
      tagline: p.tagline,
      description: p.description,
      longDescription: p.longDescription,
      priceRange: p.priceRange,
      rating: p.rating.toString(),
      heroImage: p.heroImage,
      gallery: p.gallery || [],
      roomTypes: p.roomTypes || [],
      rooms: p.rooms || [],
      amenities: p.amenities || [],
      romanticHighlights: p.romanticHighlights || [],
      awards: p.awards || [],
      reviews: p.reviews || [],
      isFeatured: p.isFeatured,
      isActive: p.isActive,
    });
  };

  const handleAdd = async () => {
    const result = await create(formData);
    if (result) {
      setShowModal(false);
      resetForm();
      toast("Property added successfully", "success");
    } else {
      toast("Failed to add property", "error");
    }
  };

  const handleEdit = async () => {
    if (!editingProperty) return;
    const result = await update(editingProperty.id, formData);
    if (result) {
      setEditingProperty(null);
      setShowModal(false);
      toast("Property updated successfully", "success");
    } else {
      toast("Failed to update property", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      toast("Property deleted successfully", "success");
    } else {
      toast("Failed to delete property", "error");
    }
  };

  const TABS = [
    { id: "basic", label: "Basic" },
    { id: "desc", label: "Description" },
    { id: "gallery", label: "Gallery" },
    { id: "rooms", label: "Rooms" },
    { id: "details", label: "Details" },
    { id: "reviews", label: "Reviews" },
    { id: "status", label: "Status" },
  ];

  return (
    <div className="min-h-screen">


      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Properties</h1>
          <p className="text-sm text-earth mt-1">Manage your luxury property collection.</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCsv table="properties" />
          {properties && properties.length > 0 && (
            <button
              onClick={() => exportToCsv(properties, [
                { key: "name", header: "Name" },
                { key: "slug", header: "Slug" },
                { key: "destination", header: "Destination" },
                { key: "location", header: "Location" },
                { key: "priceRange", header: "Price Range" },
                { key: "rating", header: "Rating" },
                { key: "tagline", header: "Tagline" },
              ], "kivara-properties")}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-sand-light text-sm text-earth hover:bg-warm-white hover:text-soft-black transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          <button
            onClick={() => { setEditingProperty(null); resetForm(); setActiveTab("basic"); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Property
          </button>
          </div>
        </div>

        <div className="bg-white border border-sand-light p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
            <input
              type="text"
              placeholder="Search properties by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50"
            />
          </div>
        </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="text-earth text-sm">Loading properties...</div></div>
      ) : (
      <div className="bg-white border border-sand-light overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-sand-light">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Destination</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Location</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Rating</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Price</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-light/50">
            {filtered.map((property) => (
              <tr key={property.id} className="hover:bg-warm-white transition-colors">
                <td className="px-4 py-3 font-medium text-soft-black">{property.name}</td>
                <td className="px-4 py-3 text-earth">{formatDestination(property.destination)}</td>
                <td className="px-4 py-3 text-earth">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {property.location}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3 h-3 fill-gold text-gold" />
                    <span className="text-gold-dark font-medium">{property.rating}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-earth text-xs">{property.priceRange}</td>
                <td className="px-4 py-3">
                  {property.isActive ? (
                    <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5">Active</span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-earth font-medium bg-warm-white px-2 py-0.5">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => { setEditingProperty(property); populateForm(property); setActiveTab("basic"); setShowModal(true); }}
                    className="text-xs text-gold hover:text-gold-dark mr-4 font-medium"
                  >Edit</button>
                  <button onClick={() => setDeleteConfirm(property.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-earth">No properties found matching your search.</div>
        )}
      </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-cream border border-sand-light w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h2 className="text-xl font-bold text-soft-black">{editingProperty ? "Edit Property" : "Add New Property"}</h2>
                <button onClick={() => setShowModal(false)} className="text-earth hover:text-soft-black"><X className="w-5 h-5" /></button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-sand-light overflow-x-auto flex-shrink-0">
                {TABS.map(tab => (
                  <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors ${
                      activeTab === tab.id ? "text-gold border-b-2 border-gold bg-white" : "text-earth hover:text-soft-black"
                    }`}>{tab.label}</button>
                ))}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {activeTab === "basic" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Property Name</label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="Kaya Mawa" /></div>
                      <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Destination</label>
                        <select value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                          className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white">
                          <option value="lake-malawi">Lake Malawi</option><option value="south-luangwa">South Luangwa</option><option value="zanzibar">Zanzibar</option>
                        </select></div>
                    </div>
                    <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Location</label>
                      <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="Likoma Island, Lake Malawi" /></div>
                    <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Tagline</label>
                      <input type="text" value={formData.tagline} onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                        className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="A brief, evocative tagline" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Price Range</label>
                        <input type="text" value={formData.priceRange} onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
                          className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="$650 to $1,200 per night" /></div>
                      <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Rating</label>
                        <input type="number" step="0.1" min="0" max="5" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                          className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" /></div>
                    </div>
                    <ImageUpload label="Hero Image" value={formData.heroImage} onChange={(url) => setFormData({ ...formData, heroImage: url })} />
                  </>
                )}

                {activeTab === "desc" && (
                  <>
                    <RichTextEditor label="Short Description (card previews)" value={formData.description} onChange={(html) => setFormData({ ...formData, description: html })} minH="120px" placeholder="Short description for cards and previews" />
                    <RichTextEditor label="Long Description (full property page)" value={formData.longDescription} onChange={(html) => setFormData({ ...formData, longDescription: html })} minH="320px" placeholder="Detailed description for the property page..." />
                  </>
                )}

                {activeTab === "gallery" && (
                  <GalleryInput value={formData.gallery} onChange={(v) => setFormData({ ...formData, gallery: v })} />
                )}

                {activeTab === "rooms" && (
                  <div className="space-y-6">
                    <TagInput label="Room Type Names" value={formData.roomTypes} onChange={(v) => setFormData({ ...formData, roomTypes: v })}
                      placeholder="e.g. Standard Room, Luxury Suite" />
                    <hr className="border-sand-light" />
                    <RoomsEditor value={formData.rooms} onChange={(v) => setFormData({ ...formData, rooms: v })} />
                  </div>
                )}

                {activeTab === "details" && (
                  <div className="space-y-6">
                    <TagInput label="Amenities" value={formData.amenities} onChange={(v) => setFormData({ ...formData, amenities: v })}
                      placeholder="e.g. Infinity pool, Spa" />
                    <TagInput label="Romantic Highlights" value={formData.romanticHighlights} onChange={(v) => setFormData({ ...formData, romanticHighlights: v })}
                      placeholder="e.g. Private beach dinners" />
                    <TagInput label="Awards" value={formData.awards} onChange={(v) => setFormData({ ...formData, awards: v })}
                      placeholder="e.g. Best New Property 2014" />
                  </div>
                )}

                {activeTab === "reviews" && (
                  <ReviewsEditor value={formData.reviews} onChange={(v) => setFormData({ ...formData, reviews: v })} />
                )}

                {activeTab === "status" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-white border border-sand-light">
                      <div>
                        <p className="text-sm font-medium text-soft-black">Featured Property</p>
                        <p className="text-xs text-earth mt-0.5">Show on homepage and featured sections</p>
                      </div>
                      <button type="button" onClick={() => setFormData({ ...formData, isFeatured: !formData.isFeatured })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${formData.isFeatured ? "bg-gold" : "bg-sand-light"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.isFeatured ? "translate-x-6" : ""}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white border border-sand-light">
                      <div>
                        <p className="text-sm font-medium text-soft-black">Active</p>
                        <p className="text-xs text-earth mt-0.5">Visible to customers on the website</p>
                      </div>
                      <button type="button" onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                        className={`relative w-12 h-6 rounded-full transition-colors ${formData.isActive ? "bg-emerald-500" : "bg-sand-light"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.isActive ? "translate-x-6" : ""}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={editingProperty ? handleEdit : handleAdd} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">
                  {editingProperty ? "Save Changes" : "Add Property"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Confirm Delete</h3>
              <p className="text-sm text-earth mb-6">Are you sure you want to delete this property? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium hover:bg-red-600">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
