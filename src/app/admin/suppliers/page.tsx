"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Building2, Plane, Car, Ship, MapPin, Phone, Mail, Star, Shield, Hotel, Users, Edit2, Trash2, X, AlertCircle, Check } from "lucide-react";
import Image from "next/image";
import { useApiData } from "@/lib/use-api-data";

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

function mapSupplier(item: any): Supplier {
  return {
    id: item.id,
    name: item.name || "",
    category: item.category || "lodge",
    location: item.city || item.address || "",
    country: item.country || "",
    contactPerson: item.contactPerson || "",
    email: item.email || "",
    phone: item.phone || "",
    commissionRate: item.commissionRate ?? 0,
    rating: item.rating ?? 0,
    status: item.status || "active",
    contractOnFile: item.contractOnFile ?? false,
    bookingsCount: item.bookingsCount ?? 0,
    totalRevenue: item.totalRevenue ?? 0,
    image: item.logo || "",
    website: item.website || "",
    notes: item.notes || "",
  };
}

function mapSupplierToApi(item: Partial<Supplier>): any {
  const result: any = {
    name: item.name,
    category: item.category, // API converts slug → category_id
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
  return result;
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

const SUPPLIER_IDS: Record<string, SupplierCategory> = {
  "1": "lodge", "2": "lodge", "3": "airline", "4": "transfer", "5": "lodge",
};

export default function AdminSuppliers() {
  const { data: suppliers, loading, create, update, remove } = useApiData<Supplier>("suppliers", {
    mapFromApi: mapSupplier,
    mapToApi: mapSupplierToApi,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SupplierCategory | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState({
    name: "", category: "lodge" as SupplierCategory, location: "", country: "",
    contactPerson: "", email: "", phone: "", commissionRate: "", rating: "",
    status: "active" as "active" | "inactive" | "blacklisted", contractOnFile: false,
    image: "", website: "", notes: ""
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
      showToast("Supplier created", "success");
    } else {
      showToast("Failed to create supplier", "error");
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
      showToast("Supplier updated", "success");
    } else {
      showToast("Failed to update supplier", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      showToast("Supplier deleted", "success");
    } else {
      showToast("Failed to delete supplier", "error");
    }
  };

  const resetForm = () => setFormData({ name: "", category: "lodge", location: "", country: "", contactPerson: "", email: "", phone: "", commissionRate: "", rating: "", status: "active", contractOnFile: false, image: "", website: "", notes: "" });

  const openAddModal = () => { setEditingSupplier(null); resetForm(); setShowModal(true); };
  const openEditModal = (supplier: Supplier) => { setEditingSupplier(supplier); setFormData({ name: supplier.name, category: supplier.category, location: supplier.location, country: supplier.country, contactPerson: supplier.contactPerson, email: supplier.email, phone: supplier.phone, commissionRate: supplier.commissionRate.toString(), rating: supplier.rating.toString(), status: supplier.status, contractOnFile: supplier.contractOnFile, image: supplier.image || "", website: supplier.website || "", notes: supplier.notes || "" }); setShowModal(true); };

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {toast && (<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>{toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}<span className="text-sm font-medium">{toast.message}</span></motion.div>)}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Suppliers</h1><p className="text-earth mt-1">Manage lodges, airlines, transfers, and activity providers</p></div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90"><Plus className="w-4 h-4" />Add Supplier</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="text-earth text-sm">Loading suppliers...</div></div>
      ) : (
      <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{ label: "Total", value: suppliers.length }, { label: "Active", value: suppliers.filter(s => s.status === "active").length }, { label: "Lodges", value: suppliers.filter(s => s.category === "lodge").length }, { label: "Revenue", value: `$${(suppliers.reduce((a, s) => a + (s.totalRevenue || 0), 0) / 1000).toFixed(0)}k` }].map(s => (<div key={s.label} className="bg-white p-4 border border-sand-light"><p className="text-2xl font-bold text-soft-black">{s.value}</p><p className="text-xs text-earth">{s.label}</p></div>))}
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" /><input type="text" placeholder="Search suppliers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" /></div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as SupplierCategory | "all")} className="px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white">
          <option value="all">All Categories</option>
          {CATEGORIES.map(cat => (<option key={cat} value={cat}>{categoryConfig[cat].label}</option>))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((supplier) => (
          <motion.div key={supplier.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-sand-light rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            {supplier.image && (<div className="relative h-32 bg-cream"><Image src={supplier.image} alt={supplier.name} fill unoptimized className="object-cover" /></div>)}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="font-bold text-soft-black">{supplier.name}</h3><p className="text-xs text-earth flex items-center gap-1"><MapPin className="w-3 h-3" />{supplier.location}{supplier.country ? `, ${supplier.country}` : ""}</p></div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${supplier.status === "active" ? "bg-emerald-50 text-emerald-700" : supplier.status === "inactive" ? "bg-gray-100 text-gray-600" : "bg-red-50 text-red-700"}`}>{supplier.status}</span>
              </div>
              <div className="flex items-center gap-2 mb-3"><span className={`px-2 py-0.5 text-xs rounded ${categoryConfig[supplier.category]?.bg || "bg-gray-50"} ${categoryConfig[supplier.category]?.color || "text-gray-600"}`}>{categoryConfig[supplier.category]?.label || supplier.category}</span><span className="text-xs text-gold flex items-center gap-1"><Star className="w-3 h-3 fill-gold text-gold" />{supplier.rating}</span></div>
              <div className="text-xs text-earth space-y-1 mb-4"><p className="flex items-center gap-1"><Mail className="w-3 h-3" />{supplier.email}</p><p className="flex items-center gap-1"><Phone className="w-3 h-3" />{supplier.phone}</p></div>
              <div className="flex items-center justify-between pt-3 border-t border-sand-light">
                <span className="text-xs text-earth">{supplier.bookingsCount} bookings</span>
                <div className="flex gap-2"><button onClick={() => openEditModal(supplier)} className="text-xs text-gold hover:text-gold-dark">Edit</button><button onClick={() => setDeleteConfirm(supplier.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button></div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      </>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0"><h2 className="text-xl font-bold text-soft-black">{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</h2><button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button></div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Supplier Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="Kaya Mawa" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as SupplierCategory })} className="w-full px-4 py-2.5 border border-sand-light text-sm">{CATEGORIES.map(cat => (<option key={cat} value={cat}>{categoryConfig[cat].label}</option>))}</select></div>
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Status</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="w-full px-4 py-2.5 border border-sand-light text-sm"><option value="active">Active</option><option value="inactive">Inactive</option><option value="blacklisted">Blacklisted</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Location</label><input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="Likoma Island" /></div>
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Country</label><input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="Malawi" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Contact Person</label><input type="text" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="John Chibwana" /></div>
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="email@supplier.com" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="+265 888 123 456" /></div>
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Website</label><input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="https://..." /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Commission %</label><input type="number" value={formData.commissionRate} onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="15" /></div>
                  <div><label className="block text-xs font-medium text-earth uppercase mb-2">Rating</label><input type="number" step="0.1" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="4.9" /></div>
                  <div className="flex items-center pt-6"><label className="flex items-center gap-2"><input type="checkbox" checked={formData.contractOnFile} onChange={(e) => setFormData({ ...formData, contractOnFile: e.target.checked })} className="w-4 h-4" /><span className="text-sm text-earth">Contract on file</span></label></div>
                </div>
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Image URL</label><input type="url" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="/images/shawa-lodge.jpg" /></div>
                <div><label className="block text-xs font-medium text-earth uppercase mb-2">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" rows={2} placeholder="Additional notes..." /></div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0"><button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white">Cancel</button><button onClick={editingSupplier ? handleEdit : handleAdd} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark">{editingSupplier ? "Save Changes" : "Create Supplier"}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}><motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-bold text-soft-black mb-2">Confirm Delete</h3><p className="text-sm text-earth mb-6">Delete this supplier?</p><div className="flex gap-3"><button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button><button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium">Delete</button></div></motion.div></motion.div>)}
      </AnimatePresence>
    </div>
  );
}
