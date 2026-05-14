"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Check, AlertCircle, Edit2, Trash2 } from "lucide-react";
import { PACKAGES } from "@/lib/constants";
import { formatDestination } from "@/lib/utils";

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

export default function AdminPackages() {
  const [packages, setPackages] = useState<Package[]>(PACKAGES.map(p => ({ id: p.id, title: p.title, subtitle: p.subtitle, description: p.description, duration: p.duration, destinations: p.destinations, price: p.price, inclusions: p.inclusions, itinerary: p.itinerary })));
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

  const handleAdd = () => {
    const newPkg: Package = {
      id: `pkg-${Date.now()}`,
      title: formData.title,
      subtitle: formData.subtitle,
      description: formData.description,
      duration: formData.duration || "7 days",
      destinations: formData.destinations.split(",").map(d => d.trim()),
      price: formData.price || "$5,000",
      inclusions: ["Luxury accommodation", "All meals", "Private transfers"],
      itinerary: [{ day: 1, title: "Arrival", description: "Welcome and transfer to property" }],
    };
    setPackages([...packages, newPkg]);
    setShowModal(false);
    setFormData({ title: "", subtitle: "", description: "", duration: "", destinations: "", price: "" });
    showToast("Package created successfully", "success");
  };

  const handleEdit = () => {
    if (!editingPackage) return;
    setPackages(packages.map(p => p.id === editingPackage.id ? editingPackage : p));
    setEditingPackage(null);
    showToast("Package updated successfully", "success");
  };

  const handleDelete = (id: string) => {
    setPackages(packages.filter(p => p.id !== id));
    setDeleteConfirm(null);
    showToast("Package deleted successfully", "success");
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

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Packages</h1>
          <p className="text-sm text-earth mt-1">Manage luxury journey packages.</p>
        </div>
        <button
          onClick={() => { setEditingPackage(null); setFormData({ title: "", subtitle: "", description: "", duration: "", destinations: "", price: "" }); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Package
        </button>
      </div>

      {/* Search */}
      <div className="bg-white border border-sand-light p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
          <input
            type="text"
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-sand-light overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-sand-light">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Duration</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Destinations</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Price</th>
              <th className="text-right px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-light/50">
            {filtered.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-warm-white transition-colors">
                <td className="px-4 py-3 font-medium text-soft-black">{pkg.title}</td>
                <td className="px-4 py-3 text-earth">{pkg.duration}</td>
                <td className="px-4 py-3 text-earth">{pkg.destinations.map(formatDestination).join(", ")}</td>
                <td className="px-4 py-3 text-gold font-medium text-xs">{pkg.price}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => { setEditingPackage(pkg); setFormData({ title: pkg.title, subtitle: pkg.subtitle, description: pkg.description, duration: pkg.duration, destinations: pkg.destinations.join(", "), price: pkg.price }); setShowModal(true); }}
                    className="text-xs text-gold hover:text-gold-dark mr-3"
                  >
                    Edit
                  </button>
                  <button onClick={() => setDeleteConfirm(pkg.id)} className="text-xs text-red-500 hover:text-red-700">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-earth">No packages found.</div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-cream border border-sand-light p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-soft-black">{editingPackage ? "Edit Package" : "Create New Package"}</h2>
                <button onClick={() => setShowModal(false)} className="text-earth hover:text-soft-black"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Package Title</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="Beach & Bush Escape" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Subtitle</label>
                  <input type="text" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="The ultimate African romance journey" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Duration</label>
                    <input type="text" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="10 days" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Price</label>
                    <input type="text" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="$8,500 per person" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Destinations (comma separated)</label>
                  <input type="text" value={formData.destinations} onChange={(e) => setFormData({ ...formData, destinations: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="lake-malawi, south-luangwa, zanzibar" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={editingPackage ? handleEdit : handleAdd} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">{editingPackage ? "Save Changes" : "Create Package"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Confirm Delete</h3>
              <p className="text-sm text-earth mb-6">Are you sure you want to delete this package?</p>
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