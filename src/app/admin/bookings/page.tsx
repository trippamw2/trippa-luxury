"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Calendar, Users, MapPin, DollarSign, Edit2, Trash2, X, Check, AlertCircle, FileText, Mail, Phone } from "lucide-react";

interface Booking {
  id: string;
  ref: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  destination: string;
  property: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: string;
  depositPaid: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  package?: string;
  specialRequests?: string;
}

const INITIAL_BOOKINGS: Booking[] = [
  { id: "1", ref: "TRP-0001", clientName: "Sarah & James Mitchell", clientEmail: "sarah@example.com", clientPhone: "+44 20 7123 4567", destination: "Lake Malawi", property: "Kaya Mawa", checkIn: "2026-06-15", checkOut: "2026-06-22", guests: 2, totalPrice: "$12,500", depositPaid: "$6,250", status: "confirmed", package: "Beach & Bush Escape", specialRequests: "Anniversary celebration" },
  { id: "2", ref: "TRP-0002", clientName: "Alexander Petrov", clientEmail: "alex@example.com", clientPhone: "+47 123 45 678", destination: "Zanzibar", property: "The Residence Zanzibar", checkIn: "2026-07-01", checkOut: "2026-07-08", guests: 2, totalPrice: "$8,200", depositPaid: "$4,100", status: "pending", package: "Romance in Zanzibar" },
  { id: "3", ref: "TRP-0003", clientName: "Emma Chen", clientEmail: "emma@example.com", clientPhone: "+61 2 1234 5678", destination: "South Luangwa", property: "Puku Ridge Camp", checkIn: "2026-08-10", checkOut: "2026-08-17", guests: 2, totalPrice: "$9,800", depositPaid: "$4,900", status: "confirmed", package: "Safari Adventure" },
  { id: "4", ref: "TRP-0004", clientName: "Michael Barnes", clientEmail: "michael@example.com", clientPhone: "+1 212 555 0198", destination: "Lake Malawi & Zanzibar", property: "Blue Zebra Island Lodge", checkIn: "2026-09-05", checkOut: "2026-09-15", guests: 2, totalPrice: "$15,000", depositPaid: "$7,500", status: "confirmed", specialRequests: "Honeymoon" },
];

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: "Confirmed", color: "text-emerald-700", bg: "bg-emerald-50" },
  pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50" },
  completed: { label: "Completed", color: "text-blue-700", bg: "bg-blue-50" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50" },
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [formData, setFormData] = useState<any>({});

  const showToast = (message: string, type: "success" | "error") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const filtered = bookings.filter(b => {
    const matchesSearch = b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || b.ref.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = { total: bookings.length, confirmed: bookings.filter(b => b.status === "confirmed").length, pending: bookings.filter(b => b.status === "pending").length };

  const handleAdd = () => {
    const newBooking: Booking = { id: `book-${Date.now()}`, ref: `TRP-${String(bookings.length + 1).padStart(4, "0")}`, ...formData, status: formData.status || "pending" };
    setBookings([...bookings, newBooking]);
    setShowModal(false);
    resetForm();
    showToast("Booking created successfully", "success");
  };

  const handleEdit = () => {
    if (!editBooking) return;
    setBookings(bookings.map(b => b.id === editBooking.id ? { ...b, ...formData } : b));
    setEditBooking(null);
    setShowModal(false);
    showToast("Booking updated successfully", "success");
  };

  const handleDelete = (id: string) => { setBookings(bookings.filter(b => b.id !== id)); setDeleteConfirm(null); showToast("Booking deleted", "success"); };
  const resetForm = () => setFormData({ clientName: "", clientEmail: "", clientPhone: "", destination: "", property: "", checkIn: "", checkOut: "", guests: "2", totalPrice: "", depositPaid: "", status: "pending", package: "", specialRequests: "" });
  const openAddModal = () => { setEditBooking(null); resetForm(); setShowModal(true); };
  const openEditModal = (booking: Booking) => { setEditBooking(booking); setFormData(booking); setShowModal(true); };

  return (
    <div className="min-h-screen">
      <AnimatePresence>{toast && (<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>{toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}<span className="text-sm font-medium">{toast.message}</span></motion.div>)}</AnimatePresence>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Bookings</h1><p className="text-earth mt-1">Manage all bookings, reservations, and guest details</p></div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90"><Plus className="w-4 h-4" />Add Booking</button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">{[{ label: "Total Bookings", value: stats.total }, { label: "Confirmed", value: stats.confirmed }, { label: "Pending", value: stats.pending }].map(s => (<div key={s.label} className="bg-white p-4 border border-sand-light"><p className="text-2xl font-bold text-soft-black">{s.value}</p><p className="text-xs text-earth">{s.label}</p></div>))}</div>
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" /><input type="text" placeholder="Search bookings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"><option value="all">All Status</option><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
      </div>
      <div className="bg-white border border-sand-light overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-warm-white border-b border-sand-light"><tr><th className="text-left px-4 py-3 font-medium text-earth">Ref</th><th className="text-left px-4 py-3 font-medium text-earth">Client</th><th className="text-left px-4 py-3 font-medium text-earth">Destination</th><th className="text-left px-4 py-3 font-medium text-earth">Dates</th><th className="text-left px-4 py-3 font-medium text-earth">Amount</th><th className="text-left px-4 py-3 font-medium text-earth">Status</th><th className="text-right px-4 py-3 font-medium text-earth">Actions</th></tr></thead><tbody className="divide-y divide-sand-light">{filtered.map(b => (<tr key={b.id} className="hover:bg-warm-white"><td className="px-4 py-3 font-medium text-gold">{b.ref}</td><td className="px-4 py-3 text-soft-black">{b.clientName}</td><td className="px-4 py-3 text-earth">{b.destination}</td><td className="px-4 py-3 text-earth">{b.checkIn} - {b.checkOut}</td><td className="px-4 py-3 font-medium text-soft-black">{b.totalPrice}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded ${STATUS_STYLES[b.status].bg} ${STATUS_STYLES[b.status].color}`}>{STATUS_STYLES[b.status].label}</span></td><td className="px-4 py-3 text-right"><button onClick={() => openEditModal(b)} className="text-xs text-gold mr-3">Edit</button><button onClick={() => setDeleteConfirm(b.id)} className="text-xs text-red-500">Delete</button></td></tr>))}</tbody></table>
      </div>
      <AnimatePresence>{showModal && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowModal(false)}><motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-soft-black">{editBooking ? "Edit Booking" : "Add New Booking"}</h2><button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button></div><div className="space-y-4">{["clientName", "clientEmail", "clientPhone", "destination", "property"].map(f => (<div key={f}><label className="block text-xs font-medium text-earth uppercase mb-2">{f.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label><input type={f.includes("Email") ? "email" : f.includes("Phone") ? "tel" : "text"} value={formData[f] || ""} onChange={e => setFormData({ ...formData, [f]: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div>))}<div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-medium text-earth uppercase mb-2">Check-in</label><input type="date" value={formData.checkIn || ""} onChange={e => setFormData({ ...formData, checkIn: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Check-out</label><input type="date" value={formData.checkOut || ""} onChange={e => setFormData({ ...formData, checkOut: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div></div><div className="grid grid-cols-3 gap-4"><div><label className="block text-xs font-medium text-earth uppercase mb-2">Total Price</label><input type="text" value={formData.totalPrice || ""} onChange={e => setFormData({ ...formData, totalPrice: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="$10,000" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Deposit</label><input type="text" value={formData.depositPaid || ""} onChange={e => setFormData({ ...formData, depositPaid: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" /></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Status</label><select value={formData.status || "pending"} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm"><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div></div><div><label className="block text-xs font-medium text-earth uppercase mb-2">Special Requests</label><textarea value={formData.specialRequests || ""} onChange={e => setFormData({ ...formData, specialRequests: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" rows={2} /></div></div><div className="flex gap-3 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 px-5 py-2.5 border border-sand-light text-earth text-sm">Cancel</button><button onClick={editBooking ? handleEdit : handleAdd} className="flex-1 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium">{editBooking ? "Save Changes" : "Create Booking"}</button></div></motion.div></motion.div>)}</AnimatePresence>
      <AnimatePresence>{deleteConfirm && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}><motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}><h3 className="text-lg font-bold text-soft-black mb-2">Confirm Delete</h3><p className="text-sm text-earth mb-6">Delete this booking?</p><div className="flex gap-3"><button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button><button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium">Delete</button></div></motion.div></motion.div>)}</AnimatePresence>
    </div>
  );
}