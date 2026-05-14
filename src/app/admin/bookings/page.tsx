"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Plus, Eye, Calendar, DollarSign, Users, MapPin, Clock, X, CheckCircle, AlertCircle, Edit2, Trash2 } from "lucide-react";

type BookingStatus = "provisional" | "confirmed" | "deposit_paid" | "balance_due" | "paid" | "in_progress" | "completed" | "cancelled" | "refunded";

interface Booking {
  id: string;
  ref: string;
  client: string;
  email: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status: BookingStatus;
  created: string;
}

const INITIAL_BOOKINGS: Booking[] = [
  { id: "1", ref: "TRP-0001", client: "Sarah & James Mitchell", email: "sarah@example.com", destination: "Lake Malawi & Zanzibar", checkIn: "2026-08-15", checkOut: "2026-08-25", guests: 2, total: 12500, status: "confirmed", created: "2026-05-10" },
  { id: "2", ref: "TRP-0002", client: "Emma & Thomas Chen", email: "emma@example.com", destination: "South Luangwa", checkIn: "2026-09-01", checkOut: "2026-09-07", guests: 2, total: 6800, status: "deposit_paid", created: "2026-05-08" },
  { id: "3", ref: "TRP-0003", client: "Alexander & Natalia Petrov", email: "alex@example.com", destination: "Zanzibar", checkIn: "2026-07-20", checkOut: "2026-07-27", guests: 2, total: 7500, status: "provisional", created: "2026-05-12" },
  { id: "4", ref: "TRP-0004", client: "Michael & Olivia Barnes", email: "michael@example.com", destination: "Lake Malawi & South Luangwa", checkIn: "2026-10-05", checkOut: "2026-10-17", guests: 2, total: 9200, status: "paid", created: "2026-04-28" },
  { id: "5", ref: "TRP-0005", client: "Anders & Ingrid Solberg", email: "anders@example.com", destination: "South Luangwa", checkIn: "2026-06-10", checkOut: "2026-06-17", guests: 2, total: 15000, status: "in_progress", created: "2026-04-15" },
  { id: "6", ref: "TRP-0006", client: "Sophie & Marc Leclerc", email: "sophie@example.com", destination: "South Luangwa", checkIn: "2026-05-01", checkOut: "2026-05-08", guests: 2, total: 6400, status: "completed", created: "2026-03-20" },
  { id: "7", ref: "TRP-0007", client: "David & Claire Mueller", email: "david@example.com", destination: "Lake Malawi", checkIn: "2026-11-15", checkOut: "2026-11-22", guests: 2, total: 4900, status: "provisional", created: "2026-05-11" },
  { id: "8", ref: "TRP-0008", client: "William & Elizabeth van der Merwe", email: "william@example.com", destination: "Zanzibar", checkIn: "2026-09-10", checkOut: "2026-09-17", guests: 2, total: 7200, status: "cancelled", created: "2026-04-20" },
];

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  provisional: { label: "Provisional", color: "text-amber-700", bg: "bg-amber-50" },
  confirmed: { label: "Confirmed", color: "text-emerald-700", bg: "bg-emerald-50" },
  deposit_paid: { label: "Deposit Paid", color: "text-blue-700", bg: "bg-blue-50" },
  balance_due: { label: "Balance Due", color: "text-orange-700", bg: "bg-orange-50" },
  paid: { label: "Paid in Full", color: "text-gold-700", bg: "bg-gold-50" },
  in_progress: { label: "In Progress", color: "text-indigo-700", bg: "bg-indigo-50" },
  completed: { label: "Completed", color: "text-earth", bg: "bg-warm-white" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50" },
  refunded: { label: "Refunded", color: "text-rose-700", bg: "bg-rose-50" },
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [statusMenu, setStatusMenu] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = b.client.toLowerCase().includes(searchQuery.toLowerCase()) || b.ref.toLowerCase().includes(searchQuery.toLowerCase()) || b.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    active: bookings.filter(b => b.status === "in_progress" || b.status === "confirmed" || b.status === "deposit_paid").length,
    checkins: bookings.filter(b => b.checkIn.startsWith("2026-05")).length,
    revenue: bookings.filter(b => b.status !== "cancelled" && b.status !== "refunded").reduce((sum, b) => sum + b.total, 0),
    pending: bookings.filter(b => b.status === "deposit_paid" || b.status === "balance_due").reduce((sum, b) => sum + (b.total * 0.3), 0),
  };

  const handleStatusChange = (id: string, newStatus: BookingStatus) => {
    setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b));
    setStatusMenu(null);
    showToast("Booking status updated", "success");
  };

  const handleDelete = (id: string) => {
    setBookings(bookings.filter(b => b.id !== id));
    setDeleteConfirm(null);
    showToast("Booking deleted", "success");
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
          <h1 className="text-2xl font-bold text-soft-black">Bookings</h1>
          <p className="text-sm text-earth mt-1">Manage reservations and client journeys.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all">
          <Plus className="w-4 h-4" />
          New Booking
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Bookings", value: stats.active, icon: Calendar, color: "text-indigo-700", bg: "bg-indigo-50" },
          { label: "Check-ins This Month", value: stats.checkins, icon: Users, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Revenue (Total)", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-gold-700", bg: "bg-gold-50" },
          { label: "Pending Payments", value: `$${Math.round(stats.pending).toLocaleString()}`, icon: Clock, color: "text-amber-700", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white p-5 border border-sand-light">
            <p className="text-xl font-bold text-soft-black">{stat.value}</p>
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
              placeholder="Search by client, reference, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "all")}
            className="px-4 py-2.5 border border-sand-light text-sm text-earth focus:outline-none focus:border-gold bg-white"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-sand-light overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-warm-white border-b border-sand-light">
              <tr>
                <th className="text-left px-4 py-3.5 font-medium text-earth text-xs uppercase tracking-wider">Reference</th>
                <th className="text-left px-4 py-3.5 font-medium text-earth text-xs uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3.5 font-medium text-earth text-xs uppercase tracking-wider">Destination</th>
                <th className="text-left px-4 py-3.5 font-medium text-earth text-xs uppercase tracking-wider">Dates</th>
                <th className="text-left px-4 py-3.5 font-medium text-earth text-xs uppercase tracking-wider">Guests</th>
                <th className="text-left px-4 py-3.5 font-medium text-earth text-xs uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3.5 font-medium text-earth text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3.5 font-medium text-earth text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-light/50">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-earth">No bookings found matching your filters.</td>
                </tr>
              ) : (
                filteredBookings.map((booking, index) => {
                  const status = STATUS_CONFIG[booking.status];
                  return (
                    <motion.tr
                      key={booking.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-warm-white transition-colors cursor-pointer"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-medium text-gold">{booking.ref}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-soft-black">{booking.client}</span>
                        <span className="block text-xs text-earth-light">{booking.email}</span>
                      </td>
                      <td className="px-4 py-3.5 text-earth max-w-[160px] truncate">{booking.destination}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-earth">{booking.checkIn}</span>
                        <span className="text-earth-light mx-1">→</span>
                        <span className="text-earth">{booking.checkOut}</span>
                      </td>
                      <td className="px-4 py-3.5 text-earth">{booking.guests}</td>
                      <td className="px-4 py-3.5 font-medium text-soft-black">${booking.total.toLocaleString()}</td>
                      <td className="px-4 py-3.5">
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setStatusMenu(statusMenu === booking.id ? null : booking.id); }}
                            className={`inline-flex items-center px-2.5 py-1 text-xs font-medium ${status.bg} ${status.color} hover:opacity-80`}
                          >
                            {status.label}
                          </button>
                          {statusMenu === booking.id && (
                            <div className="absolute top-8 left-0 z-20 bg-white border border-sand-light shadow-lg py-1 min-w-[140px]">
                              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <button
                                  key={key}
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(booking.id, key as BookingStatus); }}
                                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-warm-white ${booking.status === key ? 'font-bold' : ''}`}
                                >
                                  {config.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }} className="text-xs text-gold hover:text-gold-dark mr-3">View</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(booking.id); }} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-cream border border-sand-light p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-soft-black mb-2">Confirm Delete</h3>
              <p className="text-sm text-earth mb-6">Are you sure you want to delete this booking? This action cannot be undone.</p>
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