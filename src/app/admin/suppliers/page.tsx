"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Building2, Plane, Car, Ship, MapPin, Phone, Mail, Star, Shield, Hotel, Users, Edit2, X } from "lucide-react";
import Image from "next/image";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { SkeletonText } from "@/app/admin/components/Skeleton";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { FormInput, FormTextarea, FormSelect, FormGroup } from "@/app/admin/components/FormField";

type SupplierCategory = "lodge" | "airline" | "car-rental" | "transfer" | "activity" | "spa" | "catering";

interface Supplier {
  id: string;
  name: string;
  category: SupplierCategory;
  location: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  commissionRate: number;
  rating: number;
  status: "active" | "inactive" | "blacklisted";
  contractOnFile: boolean;
  bookingsCount: number;
  totalRevenue: number;
  image?: string;
  website?: string;
  notes?: string;
}

interface ApiSupplier {
  id: string;
  name?: string;
  category?: string;
  city?: string;
  address?: string;
  country?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  commissionRate?: number;
  rating?: number;
  status?: string;
  contractOnFile?: boolean;
  bookingsCount?: number;
  totalRevenue?: number;
  logo?: string;
  website?: string;
  notes?: string;
}

function mapSupplier(item: ApiSupplier): Supplier {
  return {
    id: item.id,
    name: item.name || "",
    category: (item.category || "lodge") as SupplierCategory,
    location: item.city || item.address || "",
    country: item.country || "",
    contactPerson: item.contactPerson || "",
    email: item.email || "",
    phone: item.phone || "",
    commissionRate: item.commissionRate ?? 0,
    rating: item.rating ?? 0,
    status: (item.status || "active") as Supplier["status"],
    contractOnFile: item.contractOnFile ?? false,
    bookingsCount: item.bookingsCount ?? 0,
    totalRevenue: item.totalRevenue ?? 0,
    image: item.logo || "",
    website: item.website || "",
    notes: item.notes || "",
  };
}

function mapSupplierToApi(item: Partial<Supplier>): Record<string, unknown> {
  return {
    name: item.name,
    category: item.category,
    contact_person: item.contactPerson,
    email: item.email,
    phone: item.phone,
    website: item.website,
    country: item.country,
    city: item.location,
    commission_rate: item.commissionRate,
    contract_on_file: item.contractOnFile,
    notes: item.notes,
    status: item.status,
    rating: item.rating,
    logo: item.image,
    slug: item.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `supplier-${Date.now()}`,
  };
}

const categoryConfig: Record<SupplierCategory, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  lodge: { label: "Lodges & Camps", icon: Hotel, color: "text-amber-600", bg: "bg-amber-50" },
  airline: { label: "Airlines", icon: Plane, color: "text-blue-600", bg: "bg-blue-50" },
  "car-rental": { label: "Car Rentals", icon: Car, color: "text-indigo-600", bg: "bg-indigo-50" },
  transfer: { label: "Transfers", icon: Ship, color: "text-cyan-600", bg: "bg-cyan-50" },
  activity: { label: "Activity Providers", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
  spa: { label: "Spa & Wellness", icon: Shield, color: "text-rose-600", bg: "bg-rose-50" },
  catering: { label: "Catering & Dining", icon: Star, color: "text-orange-600", bg: "bg-orange-50" },
};

const CATEGORIES: SupplierCategory[] = ["lodge", "airline", "car-rental", "transfer", "activity", "spa", "catering"];

export default function AdminSuppliers() {
  const { data: suppliers, loading, create, update, remove } = useApiData("suppliers", {
    mapFromApi: mapSupplier,
    mapToApi: mapSupplierToApi,
  });
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SupplierCategory | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", category: "lodge" as SupplierCategory, location: "", country: "",
    contactPerson: "", email: "", phone: "", commissionRate: "", rating: "",
    status: "active" as "active" | "inactive" | "blacklisted", contractOnFile: false,
    image: "", website: "", notes: ""
  });

  const filtered = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => setFormData({ name: "", category: "lodge", location: "", country: "", contactPerson: "", email: "", phone: "", commissionRate: "", rating: "", status: "active", contractOnFile: false, image: "", website: "", notes: "" });

  const handleAdd = async () => {
    const result = await create({
      name: formData.name, category: formData.category, location: formData.location,
      country: formData.country, contactPerson: formData.contactPerson, email: formData.email,
      phone: formData.phone, commissionRate: parseFloat(formData.commissionRate) || 10,
      rating: parseFloat(formData.rating) || 4.0, status: formData.status,
      contractOnFile: formData.contractOnFile, image: formData.image || undefined,
      website: formData.website || undefined, notes: formData.notes || undefined,
    });
    if (result) {
      setShowModal(false);
      resetForm();
      toast("Supplier created", "success");
    } else {
      toast("Failed to create supplier", "error");
    }
  };

  const handleEdit = async () => {
    if (!editingSupplier) return;
    const result = await update(editingSupplier.id, {
      ...formData, commissionRate: parseFloat(formData.commissionRate) || 10,
      rating: parseFloat(formData.rating) || 4.0,
    });
    if (result) {
      setEditingSupplier(null);
      setShowModal(false);
      toast("Supplier updated", "success");
    } else {
      toast("Failed to update supplier", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      toast("Supplier deleted", "success");
    } else {
      toast("Failed to delete supplier", "error");
    }
  };

  const openAddModal = () => { setEditingSupplier(null); resetForm(); setShowModal(true); };
  const openEditModal = (supplier: Supplier) => { setEditingSupplier(supplier); setFormData({ name: supplier.name, category: supplier.category, location: supplier.location, country: supplier.country, contactPerson: supplier.contactPerson, email: supplier.email, phone: supplier.phone, commissionRate: supplier.commissionRate.toString(), rating: supplier.rating.toString(), status: supplier.status, contractOnFile: supplier.contractOnFile, image: supplier.image || "", website: supplier.website || "", notes: supplier.notes || "" }); setShowModal(true); };

  const stats = { total: suppliers.length, active: suppliers.filter(s => s.status === "active").length, lodges: suppliers.filter(s => s.category === "lodge").length, revenue: `$${(suppliers.reduce((a, s) => a + (s.totalRevenue || 0), 0) / 1000).toFixed(0)}k` };

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Suppliers</h1><p className="text-earth mt-1">Manage lodges, airlines, transfers, and activity providers</p></div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90 transition-colors"><Plus className="w-4 h-4" />Add Supplier</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{ label: "Total", value: stats.total }, { label: "Active", value: stats.active }, { label: "Lodges", value: stats.lodges }, { label: "Revenue", value: stats.revenue }].map(s => (
          <div key={s.label} className="bg-white p-4 border border-sand-light"><p className="text-2xl font-bold text-soft-black">{s.value}</p><p className="text-xs text-earth">{s.label}</p></div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input type="text" placeholder="Search suppliers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as SupplierCategory | "all")}
          className="px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white">
          <option value="all">All Categories</option>
          {CATEGORIES.map(cat => (<option key={cat} value={cat}>{categoryConfig[cat].label}</option>))}
        </select>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-sand-light rounded-lg overflow-hidden">
              <div className="h-32 bg-sand-light" />
              <div className="p-4 space-y-2"><SkeletonText className="w-2/3" /><SkeletonText className="w-1/2" /><SkeletonText className="w-3/4" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No suppliers yet"
          description={searchQuery || categoryFilter !== "all" ? "No suppliers match your filters." : "Add your first supplier to get started."}
          action={!searchQuery && categoryFilter === "all" ? { label: "Add Supplier", onClick: openAddModal } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((supplier) => (
            <motion.div key={supplier.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-sand-light rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {supplier.image && (<div className="relative h-32 bg-cream"><Image src={supplier.image} alt={supplier.name} fill unoptimized className="object-cover" /></div>)}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div><h3 className="font-bold text-soft-black">{supplier.name}</h3><p className="text-xs text-earth flex items-center gap-1"><MapPin className="w-3 h-3" />{supplier.location}{supplier.country ? `, ${supplier.country}` : ""}</p></div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${supplier.status === "active" ? "bg-emerald-50 text-emerald-700" : supplier.status === "inactive" ? "bg-gray-100 text-gray-600" : "bg-red-50 text-red-700"}`}>{supplier.status}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 text-xs rounded ${categoryConfig[supplier.category]?.bg || "bg-gray-50"} ${categoryConfig[supplier.category]?.color || "text-gray-600"}`}>{categoryConfig[supplier.category]?.label || supplier.category}</span>
                  <span className="text-xs text-gold flex items-center gap-1"><Star className="w-3 h-3 fill-gold text-gold" />{supplier.rating}</span>
                </div>
                <div className="text-xs text-earth space-y-1 mb-4">
                  <p className="flex items-center gap-1"><Mail className="w-3 h-3" />{supplier.email}</p>
                  <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{supplier.phone}</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-sand-light">
                  <span className="text-xs text-earth">{supplier.bookingsCount} bookings</span>
                  <div className="flex gap-3">
                    <button onClick={() => openEditModal(supplier)} className="flex items-center gap-1 text-xs text-gold hover:underline"><Edit2 className="w-3 h-3" />Edit</button>
                    <button onClick={() => setDeleteConfirm(supplier.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>
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
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
                <h2 className="text-xl font-bold text-soft-black">{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</h2>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <FormInput label="Supplier Name" name="name" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Kaya Mawa" required />
                <FormGroup>
                  <FormSelect label="Category" name="category" value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value as SupplierCategory }))} options={CATEGORIES.map(cat => ({ value: cat, label: categoryConfig[cat].label }))} />
                   <FormSelect label="Status" name="status" value={formData.status} onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as Supplier["status"] }))} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "blacklisted", label: "Blacklisted" }]} />
                </FormGroup>
                <FormGroup>
                  <FormInput label="Location" name="location" value={formData.location} onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="Likoma Island" />
                  <FormInput label="Country" name="country" value={formData.country} onChange={(e) => setFormData(p => ({ ...p, country: e.target.value }))} placeholder="Malawi" />
                </FormGroup>
                <FormGroup>
                  <FormInput label="Contact Person" name="contactPerson" value={formData.contactPerson} onChange={(e) => setFormData(p => ({ ...p, contactPerson: e.target.value }))} placeholder="John Chibwana" />
                  <FormInput label="Email" name="email" type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="email@supplier.com" />
                </FormGroup>
                <FormGroup>
                  <FormInput label="Phone" name="phone" type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+265 888 123 456" />
                  <FormInput label="Website" name="website" type="url" value={formData.website} onChange={(e) => setFormData(p => ({ ...p, website: e.target.value }))} placeholder="https://..." />
                </FormGroup>
                <FormGroup>
                  <FormInput label="Commission %" name="commissionRate" type="number" value={formData.commissionRate} onChange={(e) => setFormData(p => ({ ...p, commissionRate: e.target.value }))} placeholder="15" />
                  <FormInput label="Rating" name="rating" type="number" step="0.1" value={formData.rating} onChange={(e) => setFormData(p => ({ ...p, rating: e.target.value }))} placeholder="4.9" />
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.contractOnFile} onChange={(e) => setFormData(p => ({ ...p, contractOnFile: e.target.checked }))} className="w-4 h-4 accent-gold" />
                      <span className="text-sm text-earth">Contract on file</span>
                    </label>
                  </div>
                </FormGroup>
                <FormInput label="Image URL" name="image" type="url" value={formData.image} onChange={(e) => setFormData(p => ({ ...p, image: e.target.value }))} placeholder="/images/makokola-retreat.jpg" />
                <FormTextarea label="Notes" name="notes" value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional notes..." />
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={editingSupplier ? handleEdit : handleAdd} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">{editingSupplier ? "Save Changes" : "Create Supplier"}</button>
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
              <p className="text-sm text-earth mb-6">Delete this supplier?</p>
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
