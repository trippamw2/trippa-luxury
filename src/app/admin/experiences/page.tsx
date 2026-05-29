"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Sparkles } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { DataTable, type Column } from "@/app/admin/components/DataTable";
import { SkeletonTable } from "@/app/admin/components/Skeleton";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { FormInput, FormTextarea, FormSelect, FormGroup } from "@/app/admin/components/FormField";
import { RichTextEditor } from "@/app/admin/components/RichTextEditor";
import { ImageUpload } from "@/app/admin/components/ImageUpload";

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
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", image: "", category: "Romance", sortOrder: "0" });

  const resetForm = () => setFormData({ title: "", description: "", image: "", category: "Romance", sortOrder: "0" });

  const handleAdd = async () => {
    const result = await create(formData);
    if (result) {
      setShowModal(false);
      resetForm();
      toast("Experience created successfully", "success");
    } else {
      toast("Failed to create experience", "error");
    }
  };

  const handleEdit = async () => {
    if (!editing) return;
    const result = await update(editing.id, formData);
    if (result) {
      setEditing(null);
      setShowModal(false);
      toast("Experience updated successfully", "success");
    } else {
      toast("Failed to update experience", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      toast("Experience deleted", "success");
    } else {
      toast("Failed to delete experience", "error");
    }
  };

  const openAddModal = () => { setEditing(null); resetForm(); setShowModal(true); };
  const openEditModal = (exp: Experience) => { setEditing(exp); setFormData({ title: exp.title, description: exp.description, image: exp.image, category: exp.category, sortOrder: exp.sortOrder.toString() }); setShowModal(true); };

  const columns: Column<Experience>[] = [
    { key: "sortOrder", header: "Order", className: "text-earth text-xs", render: (e) => e.sortOrder },
    { key: "title", header: "Title", render: (e) => <span className="font-medium text-soft-black">{e.title}</span> },
    {
      key: "category", header: "Category",
      render: (e) => <span className="text-xs bg-warm-white text-earth px-2 py-0.5 border border-sand-light">{e.category}</span>,
    },
    {
      key: "status", header: "Status", sortable: true,
      render: (e) => e.isActive
        ? <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5">Active</span>
        : <span className="text-[10px] uppercase tracking-wider text-earth font-medium bg-warm-white px-2 py-0.5">Inactive</span>,
    },
    {
      key: "actions", header: "", headerClassName: "text-right", className: "text-right", sortable: false,
      render: (e) => (
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => openEditModal(e)} className="text-xs text-gold hover:text-gold-dark font-medium">Edit</button>
          <button onClick={() => setDeleteConfirm(e.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Experiences</h1>
          <p className="text-sm text-earth mt-1">Manage signature experiences shown on the homepage.</p>
        </div>
        <button onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all">
          <Plus className="w-4 h-4" /> Add Experience
        </button>
      </div>

      <DataTable
        columns={columns}
        data={experiences}
        keyField="id"
        searchable
        searchPlaceholder="Search experiences..."
        loading={loading}
        exportable
        exportFilename="kivara-experiences"
        importable
        importTable="experiences"
        emptyState={
          <EmptyState
            icon={Sparkles}
            title="No experiences yet"
            description="Add your first signature experience to showcase on the homepage."
            action={{ label: "Add Experience", onClick: openAddModal }}
          />
        }
      />

      {/* ─── Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-cream border border-sand-light w-full max-w-lg max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h2 className="text-xl font-bold text-soft-black">{editing ? "Edit Experience" : "Add Experience"}</h2>
                <button onClick={() => setShowModal(false)} className="text-earth hover:text-soft-black"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <FormInput label="Title" name="title" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Private Beach Dining" required />
                <FormSelect label="Category" name="category" value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
                <FormGroup>
                  <FormInput label="Sort Order" name="sortOrder" type="number" min="0" value={formData.sortOrder} onChange={e => setFormData(p => ({ ...p, sortOrder: e.target.value }))} />
                </FormGroup>
                <ImageUpload label="Image" value={formData.image} onChange={(url) => setFormData(p => ({ ...p, image: url }))} />
                <RichTextEditor label="Description" value={formData.description} onChange={(html) => setFormData(p => ({ ...p, description: html }))} minH="200px" placeholder="Describe this experience..." />
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={editing ? handleEdit : handleAdd} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">{editing ? "Save Changes" : "Create Experience"}</button>
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
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              className="bg-cream border border-sand-light p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Delete Experience</h3>
              <p className="text-sm text-earth mb-6">Are you sure you want to delete this experience?</p>
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
