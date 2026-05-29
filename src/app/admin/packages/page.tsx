"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Search, Calendar, Edit2, Trash2 } from "lucide-react";
import { formatDestination } from "@/lib/utils";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { SkeletonText } from "@/app/admin/components/Skeleton";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { FormInput, FormTextarea, FormGroup } from "@/app/admin/components/FormField";
import { RichTextEditor } from "@/app/admin/components/RichTextEditor";
import { ImageUpload } from "@/app/admin/components/ImageUpload";
import { TagInput } from "@/app/admin/components/TagInput";

interface Package {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  destinations: string[];
  price: string;
  image?: string;
  properties?: string[];
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
    image: item.image || "",
    properties: item.properties || [],
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
    image: item.image,
    properties: item.properties,
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
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "", subtitle: "", description: "", duration: "", destinations: "",
    price: "", image: "", properties: "", inclusions: "", itinerary: "",
  });

  const filtered = packages.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.destinations.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const resetForm = () => setFormData({
    title: "", subtitle: "", description: "", duration: "", destinations: "",
    price: "", image: "", properties: "", inclusions: "", itinerary: "",
  });

  const openAddModal = () => { setEditingPackage(null); resetForm(); setShowModal(true); };

  const openEditModal = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({
      title: pkg.title,
      subtitle: pkg.subtitle,
      description: pkg.description,
      duration: pkg.duration,
      destinations: pkg.destinations.join(", "),
      price: pkg.price,
      image: pkg.image || "",
      properties: (pkg.properties || []).join(", "),
      inclusions: (pkg.inclusions || []).join("\n"),
      itinerary: (pkg.itinerary || []).map(i => i.description).join("\n"),
    });
    setShowModal(true);
  };

  const handleAdd = async () => {
    const itineraryLines = formData.itinerary.split("\n").map(l => l.trim()).filter(Boolean);
    const result = await create({
      title: formData.title,
      subtitle: formData.subtitle,
      description: formData.description,
      duration: formData.duration || "7 days",
      destinations: formData.destinations.split(",").map(d => d.trim()).filter(Boolean),
      price: formData.price || "$5,000",
      image: formData.image || "",
      properties: formData.properties.split(",").map(p => p.trim()).filter(Boolean),
      inclusions: formData.inclusions.split("\n").map(i => i.trim()).filter(Boolean),
      itinerary: itineraryLines.length > 0
        ? itineraryLines.map((line, idx) => ({ day: idx + 1, title: `Day ${idx + 1}`, description: line }))
        : [{ day: 1, title: "Arrival", description: "Welcome and transfer to property" }],
    });
    if (result) {
      setShowModal(false);
      resetForm();
      toast("Package created successfully", "success");
    } else {
      toast("Failed to create package", "error");
    }
  };

  const handleEdit = async () => {
    if (!editingPackage) return;
    const result = await update(editingPackage.id, {
      title: formData.title,
      subtitle: formData.subtitle,
      description: formData.description,
      duration: formData.duration,
      destinations: formData.destinations.split(",").map(d => d.trim()).filter(Boolean),
      price: formData.price,
      image: formData.image,
      properties: formData.properties.split(",").map(p => p.trim()).filter(Boolean),
      inclusions: formData.inclusions ? formData.inclusions.split("\n").map(i => i.trim()).filter(Boolean) : [],
      itinerary: formData.itinerary ? formData.itinerary.split("\n").map((line, idx) => ({ day: idx + 1, title: `Day ${idx + 1}`, description: line })) : [],
    });
    if (result) {
      setEditingPackage(null);
      setShowModal(false);
      toast("Package updated successfully", "success");
    } else {
      toast("Failed to update package", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      toast("Package deleted", "success");
    } else {
      toast("Failed to delete package", "error");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Packages</h1>
          <p className="text-earth mt-1">Create and manage holiday packages</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90 transition-colors">
          <Plus className="w-4 h-4" />Add Package
        </button>
      </div>

      {/* Search */}
      <div className="bg-white border border-sand-light px-4 py-3 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
          <input
            type="text"
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-sand-light text-sm focus:outline-none focus:border-gold"
          />
        </div>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-sand-light p-6 space-y-3">
              <div className="flex justify-between"><SkeletonText className="w-2/3" /><SkeletonText className="w-12" /></div>
              <SkeletonText className="w-1/2" />
              <SkeletonText className="w-full" />
              <SkeletonText className="w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No packages yet"
          description={searchQuery ? "No packages match your search." : "Create your first package to get started."}
          action={!searchQuery ? { label: "Add Package", onClick: openAddModal } : undefined}
        />
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
              {pkg.destinations.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {pkg.destinations.map(d => (
                    <span key={d} className="px-2 py-0.5 bg-sand-light text-earth text-xs">{formatDestination(d)}</span>
                  ))}
                </div>
              )}
              <p className="text-sm font-semibold text-gold mb-3">{pkg.price}</p>
              <div className="pt-3 border-t border-sand-light flex justify-between">
                <button onClick={() => openEditModal(pkg)} className="flex items-center gap-1 text-xs text-gold hover:underline">
                  <Edit2 className="w-3 h-3" />Edit
                </button>
                <button onClick={() => setDeleteConfirm(pkg.id)} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                  <Trash2 className="w-3 h-3" />Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              className="bg-cream border border-sand-light w-full max-w-lg max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h2 className="text-xl font-bold text-soft-black">{editingPackage ? "Edit Package" : "New Package"}</h2>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <FormInput label="Package Title" name="title" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} required />
                <FormInput label="Subtitle" name="subtitle" value={formData.subtitle} onChange={e => setFormData(p => ({ ...p, subtitle: e.target.value }))} />
                <RichTextEditor label="Description" value={formData.description} onChange={(html) => setFormData(p => ({ ...p, description: html }))} minH="200px" />
                <FormGroup>
                  <FormInput label="Duration" name="duration" value={formData.duration} onChange={e => setFormData(p => ({ ...p, duration: e.target.value }))} placeholder="7 days / 6 nights" />
                  <FormInput label="Price" name="price" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))} placeholder="$5,000" />
                </FormGroup>
                <TagInput label="Destinations" value={formData.destinations ? formData.destinations.split(",").map(s => s.trim()).filter(Boolean) : []} onChange={(tags) => setFormData(p => ({ ...p, destinations: tags.join(", ") }))} placeholder="lake-malawi, south-luangwa" />
                <ImageUpload label="Image" value={formData.image} onChange={(url) => setFormData(p => ({ ...p, image: url }))} />
                <TagInput label="Properties" value={formData.properties ? formData.properties.split(",").map(s => s.trim()).filter(Boolean) : []} onChange={(tags) => setFormData(p => ({ ...p, properties: tags.join(", ") }))} placeholder="kaya-mawa, chinzombo" />
                <FormTextarea label="Inclusions (one per line)" name="inclusions" value={formData.inclusions} onChange={e => setFormData(p => ({ ...p, inclusions: e.target.value }))} rows={3} placeholder="Luxury accommodation&#10;All meals&#10;Private transfers" />
                <FormTextarea label="Itinerary (one description per line)" name="itinerary" value={formData.itinerary} onChange={e => setFormData(p => ({ ...p, itinerary: e.target.value }))} rows={3} placeholder="Welcome and transfer to property&#10;Sunset cruise on the lake" />
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={editingPackage ? handleEdit : handleAdd} className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">
                  {editingPackage ? "Save Changes" : "Create Package"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation ────────────────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              className="bg-cream border border-sand-light p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-soft-black mb-2">Delete Package</h3>
              <p className="text-sm text-earth mb-6">Delete this package?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm transition-colors hover:bg-warm-white">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
