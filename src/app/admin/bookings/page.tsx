"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Plus, Eye, ChevronDown, Calendar, DollarSign, Users, MapPin, MessageCircle, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";

type BookingStatus = "provisional" | "confirmed" | "deposit_paid" | "balance_due" | "paid" | "in_progress" | "completed" | "cancelled" | "refunded";

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  provisional: { label: "Provisional", color: "text-yellow-800", bg: "bg-yellow-50" },
  confirmed: { label: "Confirmed", color: "text-green-800", bg: "bg-green-50" },
  deposit_paid: { label: "Deposit Paid", color: "text-blue-800", bg: "bg-blue-50" },
  balance_due: { label: "Balance Due", color: "text-orange-800", bg: "bg-orange-50" },
  paid: { label: "Paid in Full", color: "text-emerald-800", bg: "bg-emerald-50" },
  in_progress: { label: "In Progress", color: "text-indigo-800", bg: "bg-indigo-50" },
  completed: { label: "Completed", color: "text-gray-800", bg: "bg-gray-100" },
  cancelled: { label: "Cancelled", color: "text-red-800", bg: "bg-red-50" },
  refunded: { label: "Refunded", color: "text-pink-800", bg: "bg-pink-50" },
};

const MOCK_BOOKINGS = [
  { id: "1", ref: "TRP-0001", client: "Sarah & James Mitchell", email: "sarah@example.com", destination: "Lake Malawi & Zanzibar", checkIn: "2026-08-15", checkOut: "2026-08-25", guests: 2, total: 12500, status: "confirmed" as BookingStatus, created: "2026-05-10" },
  { id: "2", ref: "TRP-0002", client: "Emma & Thomas Chen", email: "emma@example.com", destination: "South Luangwa", checkIn: "2026-09-01", checkOut: "2026-09-07", guests: 2, total: 6800, status: "deposit_paid" as BookingStatus, created: "2026-05-08" },
  { id: "3", ref: "TRP-0003", client: "Alexander & Natalia Petrov", email: "alex@example.com", destination: "Zanzibar", checkIn: "2026-07-20", checkOut: "2026-07-27", guests: 2, total: 7500, status: "provisional" as BookingStatus, created: "2026-05-12" },
  { id: "4", ref: "TRP-0004", client: "Michael & Olivia Barnes", email: "michael@example.com", destination: "Lake Malawi & South Luangwa", checkIn: "2026-10-05", checkOut: "2026-10-17", guests: 2, total: 9200, status: "paid" as BookingStatus, created: "2026-04-28" },
  { id: "5", ref: "TRP-0005", client: "Anders & Ingrid Solberg", email: "anders@example.com", destination: "South Luangwa", checkIn: "2026-06-10", checkOut: "2026-06-17", guests: 2, total: 15000, status: "in_progress" as BookingStatus, created: "2026-04-15" },
  { id: "6", ref: "TRP-0006", client: "Sophie & Marc Leclerc", email: "sophie@example.com", destination: "South Luangwa", checkIn: "2026-05-01", checkOut: "2026-05-08", guests: 2, total: 6400, status: "completed" as BookingStatus, created: "2026-03-20" },
  { id: "7", ref: "TRP-0007", client: "David & Claire Mueller", email: "david@example.com", destination: "Lake Malawi", checkIn: "2026-11-15", checkOut: "2026-11-22", guests: 2, total: 4900, status: "provisional" as BookingStatus, created: "2026-05-11" },
  { id: "8", ref: "TRP-0008", client: "William & Elizabeth van der Merwe", email: "william@example.com", destination: "Zanzibar", checkIn: "2026-09-10", checkOut: "2026-09-17", guests: 2, total: 7200, status: "cancelled" as BookingStatus, created: "2026-04-20" },
];

const quickStats = [
  { label: "Active Bookings", value: "5", icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50" },
  { label: "Check-ins This Month", value: "3", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Revenue (MTD)", value: "$34,200", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Pending Deposit", value: "$6,800", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
];

export default function AdminBookings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [selectedBooking, setSelectedBooking] = useState<typeof MOCK_BOOKINGS[0] | null>(null);

  const filteredBookings = MOCK_BOOKINGS.filter((b) => {
    const matchesSearch = b.client.toLowerCase().includes(searchQuery.toLowerCase()) || b.ref.toLowerCase().includes(searchQuery.toLowerCase()) || b.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage reservations and client journeys.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-all">
          <Plus className="w-4 h-4" />
          New Booking
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by client, reference, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "all")}
              className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 focus:outline-none focus:border-gray-400"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">Reference</th>
                <th className="text-left px-4 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">Destination</th>
                <th className="text-left px-4 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">Dates</th>
                <th className="text-left px-4 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">Guests</th>
                <th className="text-left px-4 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3.5 font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">No bookings found matching your filters.</td>
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
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-medium text-indigo-600">{booking.ref}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-gray-900">{booking.client}</span>
                        <span className="block text-xs text-gray-400">{booking.email}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 max-w-[160px] truncate">{booking.destination}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-gray-600">{booking.checkIn}</span>
                        <span className="text-gray-300 mx-1">&rarr;</span>
                        <span className="text-gray-600">{booking.checkOut}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{booking.guests}</td>
                      <td className="px-4 py-3.5 font-medium text-gray-900">${booking.total.toLocaleString()}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button className="text-xs text-indigo-600 hover:text-indigo-800 mr-3" onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}>View</button>
                        <button className="text-xs text-gray-500 hover:text-gray-700">Edit</button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-12 px-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedBooking(null)} />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-white w-full max-w-3xl shadow-2xl"
          >
            <div className="bg-soft-black px-8 py-6 flex items-center justify-between">
              <div>
                <span className="text-xs text-gold-light tracking-widest uppercase">Booking</span>
                <h2 className="text-xl font-heading text-cream mt-1">{selectedBooking.ref}</h2>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-cream/60 hover:text-cream text-xl">&times;</button>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Client</p>
                  <p className="text-sm font-medium text-gray-900">{selectedBooking.client}</p>
                  <p className="text-xs text-gray-500">{selectedBooking.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Destination</p>
                  <p className="text-sm text-gray-900">{selectedBooking.destination}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Check In</p>
                  <p className="text-sm text-gray-900">{selectedBooking.checkIn}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Check Out</p>
                  <p className="text-sm text-gray-900">{selectedBooking.checkOut}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Guests</p>
                  <p className="text-sm text-gray-900">{selectedBooking.guests}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Amount</p>
                  <p className="text-sm font-semibold text-gray-900">${selectedBooking.total.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[selectedBooking.status].bg} ${STATUS_CONFIG[selectedBooking.status].color}`}>
                    {STATUS_CONFIG[selectedBooking.status].label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Created</p>
                  <p className="text-sm text-gray-900">{selectedBooking.created}</p>
                </div>
              </div>

              {/* Timeline / Status Actions */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Booking Timeline</h3>
                <div className="space-y-3">
                  {[
                    { action: "Booking Created", date: selectedBooking.created, status: "completed" },
                    { action: "Deposit Received", date: selectedBooking.status !== "provisional" ? "Pending" : "-", status: selectedBooking.status === "provisional" ? "pending" : "completed" },
                    { action: "Balance Paid", date: selectedBooking.status === "paid" || selectedBooking.status === "completed" || selectedBooking.status === "in_progress" ? "Completed" : "-", status: selectedBooking.status === "paid" || selectedBooking.status === "completed" || selectedBooking.status === "in_progress" ? "completed" : "pending" },
                    { action: "Journey Completed", date: selectedBooking.status === "completed" ? selectedBooking.checkOut : "-", status: selectedBooking.status === "completed" ? "completed" : "pending" },
                  ].map((step, i) => (
                    <div key={step.action} className="flex items-center gap-3">
                      {step.status === "completed" ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-300 shrink-0" />
                      )}
                      <span className={`text-sm ${step.status === "completed" ? "text-gray-900" : "text-gray-400"}`}>{step.action}</span>
                      <span className="text-xs text-gray-400 ml-auto">{step.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 pt-6 mt-6 flex flex-wrap gap-3">
                <button className="px-5 py-2.5 bg-soft-black text-cream text-xs tracking-widest uppercase hover:bg-soft-black-light transition-colors">Update Status</button>
                <button className="px-5 py-2.5 border border-gray-200 text-gray-700 text-xs tracking-widest uppercase hover:bg-gray-50 transition-colors">Send Invoice</button>
                <button className="px-5 py-2.5 border border-gray-200 text-gray-700 text-xs tracking-widest uppercase hover:bg-gray-50 transition-colors">Record Payment</button>
                <a
                  href={`https://wa.me/+27871234567?text=Hi Trippa, I'm following up on booking ${selectedBooking.ref} for ${selectedBooking.client}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-green-300 text-green-700 text-xs tracking-widest uppercase hover:bg-green-50 transition-colors"
                >
                  <MessageCircle className="w-3 h-3" />
                  WhatsApp Client
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
