"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Search, MapPin, Star, Check, AlertCircle } from "lucide-react";
import { formatDestination } from "@/lib/utils";
import { useApiData } from "@/lib/use-api-data";

interface Property {
  id: string;
  name: string;
  destination: string;
  location: string;
  priceRange: string;
  rating: number;
  heroImage?: string;
  description?: string;
  tagline?: string;
}

export default function AdminProperties() {
  const { data: properties, loading, create, update, remove } = useApiData<Property>("properties", {
    mapFromApi: (item: any) => ({
      id: item.id,
      name: item.name,
      destination: item.destination || "lake-malawi",
      location: item.location || "",
      priceRange: item.priceRange || "",
      rating: item.rating || 0,
      heroImage: item.heroImage || "",
      description: item.description || "",
      tagline: item.tagline || "",
    }),
    mapToApi: (item: any) => ({
      name: item.name,
      destination: item.destination,
      location: item.location,
      price_range: item.priceRange,
      rating: item.rating ? parseFloat(item.rating) : 0,
      hero_image: item.heroImage,
      description: item.description,
      tagline: item.tagline,
    }),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState({ name: "", destination: "lake-malawi", location: "", priceRange: "", rating: "4.5", heroImage: "", description: "", tagline: "" });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = properties.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async () => {
    const result = await create(formData);
    if (result) {
      setShowModal(false);
      setFormData({ name: "", destination: "lake-malawi", location: "", priceRange: "", rating: "4.5", heroImage: "", description: "", tagline: "" });
      showToast("Property added successfully", "success");
    } else {
      showToast("Failed to add property", "error");
    }
  };

  const handleEdit = async () => {
    if (!editingProperty) return;
    const result = await update(editingProperty.id, formData);
    if (result) {
      setEditingProperty(null);
      showToast("Property updated successfully", "success");
    } else {
      showToast("Failed to update property", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      showToast("Property deleted successfully", "success");
    } else {
      showToast("Failed to delete property", "error");
    }
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${
              toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Properties</h1>
          <p className="text-sm text-earth mt-1">Manage your luxury property collection.</p>
        </div>
        <button
          onClick={() => { setEditingProperty(null); setFormData({ name: "", destination: "lake-malawi", location: "", priceRange: "", rating: "4.5", heroImage: "", description: "", tagline: "" }); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </button>
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
              <th className="text-right px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-light/50">
            {filtered.map((property) => (
              <tr key={property.id} className="hover:bg-warm-white transition-colors">
                <td className="px-4 py-3 font-medium text-soft-black">{property.name}</td>
                <td className="px-4 py-3 text-earth">{formatDestination(property.destination)}</td>
                <td className="px-4 py-3 text-earth flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {property.location}
                </td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-gold text-gold" />
                  <span className="text-gold-dark font-medium">{property.rating}</span>
                </td>
                <td className="px-4 py-3 text-earth text-xs">{property.priceRange}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => { setEditingProperty(property); setFormData({ name: property.name, destination: property.destination, location: property.location, priceRange: property.priceRange, rating: property.rating.toString(), heroImage: property.heroImage || "", description: property.description || "", tagline: property.tagline || "" }); setShowModal(true); }}
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-cream border border-sand-light p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-soft-black">{editingProperty ? "Edit Property" : "Add New Property"}</h2>
                <button onClick={() => setShowModal(false)} className="text-earth hover:text-soft-black"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Property Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="Kaya Mawa" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Destination</label><select value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"><option value="lake-malawi">Lake Malawi</option><option value="south-luangwa">South Luangwa</option><option value="zanzibar">Zanzibar</option></select></div>
                <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Location</label><input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="Likoma Island, Lake Malawi" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Price Range</label><input type="text" value={formData.priceRange} onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="$650 to $1,200 per night" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Rating</label><input type="number" step="0.1" min="0" max="5" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Tagline</label><input type="text" value={formData.tagline} onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="A brief, evocative tagline" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" rows={3} placeholder="Short description for cards and previews" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Hero Image URL</label><input type="url" value={formData.heroImage} onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="/images/kaya-mawa.jpg or https://..." /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white">Cancel</button>
                <button onClick={editingProperty ? handleEdit : handleAdd} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark">{editingProperty ? "Save Changes" : "Add Property"}</button>
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
              <p className="text-sm text-earth mb-6">Are you sure you want to delete this property?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
