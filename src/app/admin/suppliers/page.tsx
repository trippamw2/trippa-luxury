"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Building2, Plane, Car, Ship, MapPin, Phone, Mail, Star, Shield, MoreHorizontal, CheckCircle, Hotel, Users, Edit2, Trash2, X, AlertCircle } from "lucide-react";

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
}

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: "1", name: "Kaya Mawa", category: "lodge", location: "Likoma Island", country: "Malawi", contactPerson: "John Chibwana", email: "reservations@kayamawa.com", phone: "+265 888 123 456", commissionRate: 15, rating: 4.9, status: "active", contractOnFile: true, bookingsCount: 12, totalRevenue: 84000 },
  { id: "2", name: "Puku Ridge Camp", category: "lodge", location: "South Luangwa", country: "Zambia", contactPerson: "Grace Banda", email: "grace@pukuridge.com", phone: "+260 977 123 456", commissionRate: 18, rating: 4.9, status: "active", contractOnFile: true, bookingsCount: 18, totalRevenue: 126000 },
  { id: "3", name: "ProFlight Zambia", category: "airline", location: "Lusaka", country: "Zambia", contactPerson: "Michael Zulu", email: "charter@proflight.zm", phone: "+260 211 123 456", commissionRate: 8, rating: 4.5, status: "active", contractOnFile: true, bookingsCount: 32, totalRevenue: 48000 },
  { id: "4", name: "Zanzibar Luxury Transfers", category: "transfer", location: "Zanzibar", country: "Tanzania", contactPerson: "Ali Hassan", email: "ali@zlt.co.tz", phone: "+255 777 123 456", commissionRate: 10, rating: 4.3, status: "active", contractOnFile: false, bookingsCount: 24, totalRevenue: 14400 },
  { id: "5", name: "Avis Zanzibar", category: "car-rental", location: "Zanzibar", country: "Tanzania", contactPerson: "Fatima Juma", email: "zanzibar@avis.com", phone: "+255 774 456 789", commissionRate: 5, rating: 4.2, status: "active", contractOnFile: true, bookingsCount: 8, totalRevenue: 6400 },
  { id: "6", name: "Xanadu Villas", category: "lodge", location: "Kendwa", country: "Tanzania", contactPerson: "Sophie Laurent", email: "concierge@xanadu.com", phone: "+255 776 789 012", commissionRate: 15, rating: 4.9, status: "active", contractOnFile: true, bookingsCount: 15, totalRevenue: 105000 },
  { id: "7", name: "Bush & Beyond Guides", category: "activity", location: "South Luangwa", country: "Zambia", contactPerson: "David Mwale", email: "david@bushandbeyond.com", phone: "+260 966 345 678", commissionRate: 12, rating: 4.8, status: "active", contractOnFile: true, bookingsCount: 45, totalRevenue: 36000 },
  { id: "8", name: "Malawi Air Charters", category: "airline", location: "Lilongwe", country: "Malawi", contactPerson: "Chimwemwe Phiri", email: "charter@malawiair.mw", phone: "+265 999 234 567", commissionRate: 8, rating: 4.4, status: "inactive", contractOnFile: false, bookingsCount: 6, totalRevenue: 12000 },
  { id: "9", name: "Ocean Spa Zanzibar", category: "spa", location: "Paje", country: "Tanzania", contactPerson: "Aisha Mohammed", email: "aisha@oceanspa.co.tz", phone: "+255 773 890 123", commissionRate: 20, rating: 4.7, status: "active", contractOnFile: true, bookingsCount: 20, totalRevenue: 16000 },
];

const categoryConfig: Record<SupplierCategory, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  lodge: { label: "Lodges & Camps", icon: Hotel, color: "text-amber-600", bg: "bg-amber-50" },
  airline: { label: "Airlines", icon: Plane, color: "text-blue-600", bg: "bg-blue-50" },
  "car-rental": { label: "Car Rentals", icon: Car, color: "text-indigo-600", bg: "bg-indigo-50" },
  transfer: { label: "Transfers", icon: Ship, color: "text-cyan-600", bg: "bg-cyan-50" },
  activity: { label: "Activity Providers", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
  spa: { label: "Spa & Wellness", icon: Shield, color: "text-rose-600", bg: "bg-rose-50" },
  catering: { label: "Catering & Dining", icon: Star, color: "text-orange-600", bg: "bg-orange-50" },
};

const statusConfig = {
  active: { label: "Active", color: "text-emerald-700", bg: "bg-emerald-50" },
  inactive: { label: "Inactive", color: "text-gray-600", bg: "bg-gray-100" },
  blacklisted: { label: "Blacklisted", color: "text-red-700", bg: "bg-red-50" },
};

const CATEGORIES: SupplierCategory[] = ["lodge", "airline", "car-rental", "transfer", "activity", "spa", "catering"];

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SupplierCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState<{ name: string; category: SupplierCategory; location: string; country: string; contactPerson: string; email: string; phone: string; commissionRate: string; rating: string; status: "active" | "inactive" | "blacklisted" }>({ name: "", category: "lodge", location: "", country: "", contactPerson: "", email: "", phone: "", commissionRate: "10", rating: "4.5", status: "active" });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.location.toLowerCase().includes(searchQuery.toLowerCase()) || s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalCommissions = suppliers.filter(s => s.status === "active").reduce((sum, s) => sum + (s.totalRevenue * s.commissionRate / 100), 0);

  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.status === "active").length,
    lodges: suppliers.filter(s => s.category === "lodge").length,
    transfers: suppliers.filter(s => s.category === "airline" || s.category === "transfer").length,
  };

  const handleAdd = () => {
    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      name: formData.name,
      category: formData.category,
      location: formData.location,
      country: formData.country,
      contactPerson: formData.contactPerson,
      email: formData.email,
      phone: formData.phone,
      commissionRate: parseInt(formData.commissionRate) || 10,
      rating: parseFloat(formData.rating) || 4.5,
      status: formData.status,
      contractOnFile: false,
      bookingsCount: 0,
      totalRevenue: 0,
    };
    setSuppliers([...suppliers, newSupplier]);
    setShowModal(false);
    setFormData({ name: "", category: "lodge", location: "", country: "", contactPerson: "", email: "", phone: "", commissionRate: "10", rating: "4.5", status: "active" });
    showToast("Supplier added successfully", "success");
  };

  const handleEdit = () => {
    if (!editingSupplier) return;
    setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? editingSupplier : s));
    setEditingSupplier(null);
    showToast("Supplier updated successfully", "success");
  };

  const handleDelete = (id: string) => {
    setSuppliers(suppliers.filter(s => s.id !== id));
    setDeleteConfirm(null);
    showToast("Supplier deleted successfully", "success");
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
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Suppliers</h1>
          <p className="text-sm text-earth mt-1">Manage lodges, airlines, car rentals, transfer services, and activity partners.</p>
        </div>
        <button
          onClick={() => { setEditingSupplier(null); setFormData({ name: "", category: "lodge", location: "", country: "", contactPerson: "", email: "", phone: "", commissionRate: "10", rating: "4.5", status: "active" }); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Suppliers", value: stats.total.toString() },
          { label: "Active Partners", value: stats.active.toString() },
          { label: "Lodges & Camps", value: stats.lodges.toString() },
          { label: "Airlines & Transfers", value: stats.transfers.toString() },
          { label: "Comm. This Month", value: `$${Math.round(totalCommissions / 12).toLocaleString()}` },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white p-4 border border-sand-light">
            <p className="text-lg font-bold text-soft-black">{stat.value}</p>
            <p className="text-xs text-earth mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(categoryConfig).map(([key, config]) => {
          const count = suppliers.filter(s => s.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setCategoryFilter(categoryFilter === key ? "all" : key as SupplierCategory)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${categoryFilter === key ? `${config.bg} ${config.color} ring-1 ring-inset ring-current` : "bg-warm-white text-earth hover:bg-sand-light"}`}
            >
              <config.icon className="w-3.5 h-3.5" />
              {config.label}
              <span className="ml-0.5 opacity-60">({count})</span>
            </button>
          );
        })}
        {categoryFilter !== "all" && (
          <button onClick={() => setCategoryFilter("all")} className="px-3 py-2 text-xs text-earth-light hover:text-earth">Clear filter</button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white border border-sand-light p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
            <input type="text" placeholder="Search suppliers by name, location, or contact..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-sand-light text-sm text-earth focus:outline-none focus:border-gold bg-white">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
        </div>
      </div>

      {/* Supplier List */}
      <div className="space-y-4">
        {filteredSuppliers.length === 0 ? (
          <div className="bg-white border border-sand-light p-12 text-center">
            <Building2 className="w-10 h-10 text-sand-light mx-auto mb-3" />
            <p className="text-sm text-earth">No suppliers found matching your criteria.</p>
          </div>
        ) : (
          filteredSuppliers.map((supplier, index) => {
            const category = categoryConfig[supplier.category];
            const status = statusConfig[supplier.status];
            const Icon = category.icon;

            return (
              <motion.div key={supplier.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} className="bg-white border border-sand-light p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${category.bg}`}>
                      <Icon className={`w-5 h-5 ${category.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold text-soft-black">{supplier.name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium ${category.bg} ${category.color}`}>{category.label}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium ${status.bg} ${status.color}`}>{status.label}</span>
                        {supplier.contractOnFile && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                            <CheckCircle className="w-3 h-3" /> Contract
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-earth flex items-center gap-1"><MapPin className="w-3 h-3" />{supplier.location}, {supplier.country}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-earth-light">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{supplier.email}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{supplier.phone}</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-gold" />{supplier.rating}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-earth-light">
                        <span>Contact: {supplier.contactPerson}</span>
                        <span>Commission: {supplier.commissionRate}%</span>
                        <span>{supplier.bookingsCount} bookings</span>
                        <span className="font-medium text-earth">${supplier.totalRevenue.toLocaleString()} revenue</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setEditingSupplier(supplier); setFormData({ name: supplier.name, category: supplier.category, location: supplier.location, country: supplier.country, contactPerson: supplier.contactPerson, email: supplier.email, phone: supplier.phone, commissionRate: supplier.commissionRate.toString(), rating: supplier.rating.toString(), status: supplier.status as "active" | "inactive" | "blacklisted" }); setShowModal(true); }} className="px-3 py-1.5 text-xs text-gold hover:bg-gold/10 transition-colors">Edit</button>
                    <button onClick={() => setDeleteConfirm(supplier.id)} className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">Delete</button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-cream border border-sand-light p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-soft-black">{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</h2>
                <button onClick={() => setShowModal(false)} className="text-earth hover:text-soft-black"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Supplier Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="Kaya Mawa" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as SupplierCategory })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white">
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{categoryConfig[cat].label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" | "blacklisted" })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blacklisted">Blacklisted</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Location</label>
                    <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="Likoma Island" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Country</label>
                    <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="Malawi" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Contact Person</label>
                    <input type="text" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="John Chibwana" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="email@example.com" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Phone</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" placeholder="+265..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Commission %</label>
                    <input type="number" value={formData.commissionRate} onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Rating</label>
                    <input type="number" step="0.1" min="0" max="5" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors">Cancel</button>
                <button onClick={editingSupplier ? handleEdit : handleAdd} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">{editingSupplier ? "Save Changes" : "Add Supplier"}</button>
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
              <p className="text-sm text-earth mb-6">Are you sure you want to delete this supplier? This action cannot be undone.</p>
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