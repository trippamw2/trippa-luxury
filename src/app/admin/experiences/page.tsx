"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, Check, AlertCircle } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";

interface Experience {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

const CATEGORIES = ["Romance", "Safari", "Wellness", "Dining", "Adventure", "Cultural"];

export default function AdminExperiences() {
  const { data: experiences, loading, create, update, remove } = useApiData<Experience>("experiences", {
    mapFromApi: (item: any) => ({
      id: item.id,
      slug: item.slug || "",
      title: item.title,
      description: item.description || "",
      image: item.image || "",
      category: item.category || "",
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
    }),
    mapToApi: (item: any) => ({
      slug: item.slug || item.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      title: item.title,
      description: item.description,
      image: item.image,
      category: item.category,
      sort_order: parseInt(item.sortOrder) || 0,
      is_active: item.isActive !== false,
    }),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", image: "", category: "Romance", sortOrder: "0" });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = experiences.filter(e =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => setFormData({ title: "", description: "", image: "", category: "Romance", sortOrder: "0" });

  const handleAdd = async () => {
    const result = await create(formData);
    if (result) {
      setShowModal(false);
      resetForm();
      showToast("Experience created successfully", "success");
    } else {
      showToast("Failed to create experience", "error");
    }
  };

  const handleEdit = async () => {
    if (!editing) return;
    const result = await update(editing.id, formData);
    if (result) {
      setEditing(null);
      setShowModal(false);
      showToast("Experience updated successfully", "success");
    } else {
      showToast("Failed to update experience", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      showToast("Experience deleted successfully", "success");
    } else {
      showToast("Failed to delete experience", "error");
    }
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${
              toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
            {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Experiences</h1>
          <p className="text-sm text-earth mt-1">Manage signature experiences shown on the homepage.</p>
        </div>
        <button onClick={() => { setEditing(null); resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all">
          <Plus className="w-4 h-4" /> Add Experience
        </button>
      </div>

      <div className="bg-white border border-sand-light p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
          <input type="text" placeholder="Search experiences..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="text-earth text-sm">Loading experiences...</div></div>
      ) : (
      <div className="bg-white border border-sand-light overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-warm-white border-b border-sand-light">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Order</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Category</th>
              <th className="text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-light/50">
            {filtered.map((exp) => (
              <tr key={exp.id} className="hover:bg-warm-white transition-colors">
                <td className="px-4 py-3 text-earth text-xs">{exp.sortOrder}</td>
                <td className="px-4 py-3 font-medium text-soft-black">{exp.title}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-warm-white text-earth px-2 py-0.5 border border-sand-light">{exp.category}</span>
                </td>
                <td className="px-4 py-3">
                  {exp.isActive ? (
                    <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5">Active</span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-earth font-medium bg-warm-white px-2 py-0.5">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEditing(exp); setFormData({ title: exp.title, description: exp.description, image: exp.image, category: exp.category, sortOrder: exp.sortOrder.toString() }); setShowModal(true); }}
                    className="text-xs text-gold hover:text-gold-dark mr-4 font-medium">Edit</button>
                  <button onClick={() => setDeleteConfirm(exp.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-12 text-center text-earth">No experiences found.</div>}
      </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-cream border border-sand-light w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h2 className="text-xl font-bold text-soft-black">{editing ? "Edit Experience" : "Add Experience"}</h2>
                <button onClick={() => setShowModal(false)} className="text-earth hover:text-soft-black"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Title</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="Private Beach Dining" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Sort Order</label>
                    <input type="number" min="0" value={formData.sortOrder} onChange={e => setFormData({...formData, sortOrder: e.target.value})}
                      className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" /></div>
                </div>
                <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Image URL</label>
                  <input type="url" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})}
                    className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="/images/dining.jpg" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" rows={3} placeholder="Describe this experience..." /></div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white">Cancel</button>
                <button onClick={editing ? handleEdit : handleAdd} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark">{editing ? "Save Changes" : "Create Experience"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Delete Experience</h3>
              <p className="text-sm text-earth mb-6">Are you sure you want to delete this experience?</p>
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
