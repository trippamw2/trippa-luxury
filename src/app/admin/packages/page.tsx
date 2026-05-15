"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Check, AlertCircle, Edit2, Trash2 } from "lucide-react";
import { formatDestination } from "@/lib/utils";
import { useApiData } from "@/lib/use-api-data";

interface Package {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  destinations: string[];
  price: string;
  inclusions: string[];
  itinerary: { day: number; title: string; description: string }[];
}

function mapPkg(item: any): Package {
  return {
    id: item.id,
    title: item.title || "",
    subtitle: item.subtitle || "",
    description: item.description || "",
    duration: item.duration || "",
    destinations: item.destinations || [],
    price: item.price || "",
    inclusions: item.inclusions || [],
    itinerary: item.itinerary || [],
  };
}

function mapPkgToApi(item: Partial<Package>): any {
  return {
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    duration: item.duration,
    destinations: item.destinations,
    price: item.price,
    inclusions: item.inclusions,
    itinerary: item.itinerary,
    slug: item.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `pkg-${Date.now()}`,
    is_active: true,
  };
}

export default function AdminPackages() {
  const { data: packages, loading, create, update, remove } = useApiData<Package>("packages", {
    mapFromApi: mapPkg,
    mapToApi: mapPkgToApi,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState({ title: "", subtitle: "", description: "", duration: "", destinations: "", price: "" });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = packages.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.destinations.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAdd = async () => {
    const result = await create({
      title: formData.title,
      subtitle: formData.subtitle,
      description: formData.description,
      duration: formData.duration || "7 days",
      destinations: formData.destinations.split(",").map(d => d.trim()),
      price: formData.price || "$5,000",
      inclusions: ["Luxury accommodation", "All meals", "Private transfers"],
      itinerary: [{ day: 1, title: "Arrival", description: "Welcome and transfer to property" }],
    });
    if (result) {
      setShowModal(false);
      setFormData({ title: "", subtitle: "", description: "", duration: "", destinations: "", price: "" });
      showToast("Package created successfully", "success");
    } else {
      showToast("Failed to create package", "error");
    }
  };

  const handleEdit = async () => {
    if (!editingPackage) return;
    const result = await update(editingPackage.id, {
      title: formData.title,
      subtitle: formData.subtitle,
      description: formData.description,
      duration: formData.duration,
      destinations: formData.destinations.split(",").map(d => d.trim()),
      price: formData.price,
    });
    if (result) {
      setEditingPackage(null);
      setShowModal(false);
      showToast("Package updated successfully", "success");
    } else {
      showToast("Failed to update package", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      showToast("Package deleted successfully", "success");
    } else {
      showToast("Failed to delete package", "error");
    }
  };

  const openEditModal = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({
      title: pkg.title,
      subtitle: pkg.subtitle,
      description: pkg.description,
      duration: pkg.duration,
      destinations: pkg.destinations.join(", "),
      price: pkg.price,
    });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>{toast && (<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>{toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}<span className="text-sm font-medium">{toast.message}</span></motion.div>)}</AnimatePresence>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Packages</h1><p className="text-earth mt-1">Create and manage holiday packages</p></div>
        <button onClick={() => { setEditingPackage(null); setFormData({ title: "", subtitle: "", description: "", duration: "", destinations: "", price: "" }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90"><Plus className="w-4 h-4" />Add Package</button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="text-earth text-sm">Loading packages...</div></div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(pkg => (
          <div key={pkg.id} className="bg-white border border-sand-light p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-soft-black">{pkg.title}</h3>
              <span className="text-xs text-gold font-medium">{pkg.duration}</span>
            </div>
            {pkg.subtitle && <p className="text-xs text-earth mb-2">{pkg.subtitle}</p>}
            <p className="text-sm text-earth mb-3 line-clamp-2">{pkg.description}</p>
            {pkg.destinations.length > 0 && (<div className="flex flex-wrap gap-1 mb-3">{pkg.destinations.map(d => <span key={d} className="px-2 py-0.5 bg-sand-light text-earth text-xs">{formatDestination(d)}</span>)}</div>)}
            <p className="text-sm font-semibold text-gold mb-3">{pkg.price}</p>
            <div className="pt-3 border-t border-sand-light flex justify-between">
              <button onClick={() => openEditModal(pkg)} className="text-xs text-gold">Edit</button>
              <button onClick={() => setDeleteConfirm(pkg.id)} className="text-xs text-red-500">Delete</button>
            </div>
          </div>
        ))}
      </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-soft-black">{editingPackage ? "Edit Package" : "New Package"}</h2><button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button></div>
              <div className="space-y-4">
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Package Title</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Subtitle</label><input type="text" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 border border-sand-light text-sm" rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Duration</label><input type="text" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="7 days / 6 nights" /></div>
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Price</label><input type="text" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="$5,000" /></div>
                </div>
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Destinations (comma separated)</label><input type="text" value={formData.destinations} onChange={e => setFormData({...formData, destinations: e.target.value})} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="lake-malawi, south-luangwa" /></div>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-sand-light">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button>
                <button onClick={editingPackage ? handleEdit : handleAdd} className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium">{editingPackage ? "Save Changes" : "Create Package"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Delete Package</h3>
              <p className="text-sm text-earth mb-6">Delete this package?</p>
              <div className="flex gap-3"><button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button><button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium">Delete</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
