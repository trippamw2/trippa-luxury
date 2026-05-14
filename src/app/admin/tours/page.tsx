"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit2, Trash2, X, Clock, MapPin, DollarSign, Users, Star, Check, AlertCircle, Eye, Copy, Archive } from "lucide-react";
import { formatDestination } from "@/lib/utils";

interface Tour {
  id: string;
  title: string;
  category: string;
  destination: string;
  durationDays: number;
  pricingFrom: number;
  currency: string;
  status: "active" | "draft" | "archived";
  bookings: number;
  rating: number;
  featured: boolean;
}

const INITIAL_TOURS: Tour[] = [
  { id: "1", title: "Walking Safari Adventure", category: "Safari", destination: "south-luangwa", durationDays: 3, pricingFrom: 1200, currency: "USD", status: "active", bookings: 8, rating: 4.9, featured: true },
  { id: "2", title: "Sunset Dhow Cruise & Beach Dinner", category: "Romance", destination: "zanzibar", durationDays: 1, pricingFrom: 350, currency: "USD", status: "active", bookings: 15, rating: 4.8, featured: true },
  { id: "3", title: "Private Island Picnic Experience", category: "Romance", destination: "lake-malawi", durationDays: 1, pricingFrom: 450, currency: "USD", status: "active", bookings: 6, rating: 5.0, featured: false },
  { id: "4", title: "Full-Day Safari Game Drive", category: "Safari", destination: "south-luangwa", durationDays: 1, pricingFrom: 400, currency: "USD", status: "active", bookings: 22, rating: 4.7, featured: false },
  { id: "5", title: "Spice Plantation & Stone Town Tour", category: "Cultural", destination: "zanzibar", durationDays: 1, pricingFrom: 200, currency: "USD", status: "active", bookings: 12, rating: 4.5, featured: false },
  { id: "6", title: "Couples Spa & Wellness Retreat", category: "Wellness", destination: "zanzibar", durationDays: 3, pricingFrom: 1800, currency: "USD", status: "active", bookings: 4, rating: 4.9, featured: true },
  { id: "7", title: "Guided Kayak & Snorkel Expedition", category: "Adventure", destination: "lake-malawi", durationDays: 1, pricingFrom: 180, currency: "USD", status: "draft", bookings: 0, rating: 0, featured: false },
  { id: "8", title: "Stargazing Sleepout on the Floodplain", category: "Romance", destination: "south-luangwa", durationDays: 1, pricingFrom: 600, currency: "USD", status: "active", bookings: 3, rating: 5.0, featured: true },
];

const categoryColors: Record<string, string> = {
  Safari: "bg-amber-50 text-amber-700 border-amber-200",
  Romance: "bg-rose-50 text-rose-700 border-rose-200",
  Cultural: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Wellness: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Adventure: "bg-blue-50 text-blue-700 border-blue-200",
  Dining: "bg-orange-50 text-orange-700 border-orange-200",
};

const CATEGORIES = ["Safari", "Romance", "Cultural", "Wellness", "Adventure", "Dining"];

export default function AdminTours() {
  const [tours, setTours] = useState<Tour[]>(INITIAL_TOURS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState<{ title: string; category: string; destination: string; durationDays: string; pricingFrom: string; status: "active" | "draft" | "archived"; featured: boolean }>({ title: "", category: "Safari", destination: "lake-malawi", durationDays: "1", pricingFrom: "", status: "draft", featured: false });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredTours = tours.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tours.length,
    active: tours.filter(t => t.status === "active").length,
    safari: tours.filter(t => t.category === "Safari").length,
    romance: tours.filter(t => t.category === "Romance").length,
  };

  const handleAdd = () => {
    const newTour: Tour = {
      id: `tour-${Date.now()}`,
      title: formData.title,
      category: formData.category,
      destination: formData.destination,
      durationDays: parseInt(formData.durationDays) || 1,
      pricingFrom: parseInt(formData.pricingFrom) || 0,
      currency: "USD",
      status: formData.status,
      bookings: 0,
      rating: 0,
      featured: formData.featured,
    };
    setTours([...tours, newTour]);
    setShowModal(false);
    setFormData({ title: "", category: "Safari", destination: "lake-malawi", durationDays: "1", pricingFrom: "", status: "draft", featured: false });
    showToast("Tour created successfully", "success");
  };

  const handleEdit = () => {
    if (!editingTour) return;
    setTours(tours.map(t => t.id === editingTour.id ? editingTour : t));
    setEditingTour(null);
    showToast("Tour updated successfully", "success");
  };

  const handleDelete = (id: string) => {
    setTours(tours.filter(t => t.id !== id));
    setDeleteConfirm(null);
    showToast("Tour deleted successfully", "success");
  };

  const handleDuplicate = (tour: Tour) => {
    const newTour: Tour = {
      ...tour,
      id: `tour-${Date.now()}`,
      title: `${tour.title} (Copy)`,
      status: "draft",
      bookings: 0,
    };
    setTours([...tours, newTour]);
    showToast("Tour duplicated successfully", "success");
  };

  return (
    <div className="min-h-screen">
      {/* Toast */}
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
          <h1 className="text-2xl font-bold text-soft-black">Tours & Experiences</h1>
          <p className="text-sm text-earth mt-1">Create and manage tour products, activities, and experiences.</p>
        </div>
        <button
          onClick={() => { setEditingTour(null); setFormData({ title: "", category: "Safari", destination: "lake-malawi", durationDays: "1", pricingFrom: "", status: "draft", featured: false }); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Tour
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Tours", value: stats.total, color: "text-soft-black", bg: "bg-warm-white" },
          { label: "Active Experiences", value: stats.active, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Safari Adventures", value: stats.safari, color: "text-amber-700", bg: "bg-amber-50" },
          { label: "Romantic Experiences", value: stats.romance, color: "text-rose-700", bg: "bg-rose-50" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`p-5 border ${i === 0 ? 'border-sand-light' : 'border-transparent'}`} style={{ backgroundColor: stat.bg }}>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-earth mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-sand-light p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
            <input
              type="text"
              placeholder="Search tours by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-sand-light text-sm text-earth focus:outline-none focus:border-gold bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Tours Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTours.length === 0 ? (
          <div className="col-span-full text-center py-12 text-sm text-earth">No tours found. Create your first experience.</div>
        ) : (
          filteredTours.map((tour, index) => (
            <motion.div
              key={tour.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="bg-white border border-sand-light overflow-hidden group hover:shadow-lg transition-shadow"
            >
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${categoryColors[tour.category] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {tour.category}
                  </span>
                  <div className="flex items-center gap-1">
                    {tour.featured && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${tour.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : tour.status === "draft" ? "bg-sand-light text-earth border-sand" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
                      {tour.status}
                    </span>
                  </div>
                </div>
                <h3 className="text-base font-semibold text-soft-black mb-1">{tour.title}</h3>
                <p className="text-xs text-earth flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {formatDestination(tour.destination)}
                </p>
              </div>

              <div className="px-6 pb-4">
                <div className="flex items-center gap-4 text-xs text-earth">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tour.durationDays} {tour.durationDays === 1 ? "day" : "days"}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{tour.bookings} bookings</span>
                  {tour.rating > 0 && <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-gold text-gold" />{tour.rating}</span>}
                </div>
                <div className="mt-3 pt-3 border-t border-sand-light flex items-center justify-between">
                  <span className="text-sm font-semibold text-soft-black">
                    ${tour.pricingFrom.toLocaleString()}
                    <span className="text-xs text-earth font-normal"> /person</span>
                  </span>
                </div>
              </div>

              <div className="px-6 py-3 bg-warm-white flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleDuplicate(tour)} className="text-xs text-gold hover:text-gold-dark flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Duplicate
                  </button>
                  <button onClick={() => { setEditingTour(tour); setFormData({ title: tour.title, category: tour.category, destination: tour.destination, durationDays: tour.durationDays.toString(), pricingFrom: tour.pricingFrom.toString(), status: tour.status, featured: tour.featured }); setShowModal(true); }} className="text-xs text-gold hover:text-gold-dark flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                </div>
                <button onClick={() => setDeleteConfirm(tour.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-cream border border-sand-light p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-soft-black">{editingTour ? "Edit Tour" : "Create New Tour"}</h2>
                <button onClick={() => setShowModal(false)} className="text-earth hover:text-soft-black">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Tour Name</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"
                    placeholder="Walking Safari Adventure"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Destination</label>
                    <select
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"
                    >
                      <option value="lake-malawi">Lake Malawi</option>
                      <option value="south-luangwa">South Luangwa</option>
                      <option value="zanzibar">Zanzibar</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Duration (days)</label>
                    <input
                      type="number"
                      value={formData.durationDays}
                      onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                      className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Price (USD)</label>
                    <input
                      type="number"
                      value={formData.pricingFrom}
                      onChange={(e) => setFormData({ ...formData, pricingFrom: e.target.value })}
                      className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"
                      placeholder="350"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase tracking-wider mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "draft" | "archived" })}
                      className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                        className="w-4 h-4 text-gold border-sand-light focus:ring-gold"
                      />
                      <span className="text-sm text-earth">Featured</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTour ? handleEdit : handleAdd}
                  className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors"
                >
                  {editingTour ? "Save Changes" : "Create Tour"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-cream border border-sand-light p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-soft-black mb-2">Confirm Delete</h3>
              <p className="text-sm text-earth mb-6">Are you sure you want to delete this tour? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}