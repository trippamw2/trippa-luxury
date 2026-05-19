"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Calendar, Users, MapPin, DollarSign, Edit2, Trash2, X, Check, AlertCircle, FileText, Mail, Phone } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";

type BookingStatus = "provisional" | "deposit_paid" | "confirmed" | "balance_due" | "paid" | "in_progress" | "completed" | "cancelled" | "refunded";

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
  status: BookingStatus;
  package?: string;
  specialRequests?: string;
}

function mapBooking(item: any): Booking {
  return {
    id: item.id,
    ref: item.bookingReference || `TRP-${String(item.id || "").slice(0, 4).toUpperCase()}`,
    clientName: item.clientName || "",
    clientEmail: item.clientEmail || "",
    clientPhone: item.clientPhone || "",
    destination: item.destination || "",
    property: item.propertyId || "",
    checkIn: item.startDate || "",
    checkOut: item.endDate || "",
    guests: item.guestsCount || 2,
    totalPrice: item.totalAmount ? `$${(+item.totalAmount).toLocaleString()}` : "$0",
    depositPaid: item.depositAmount ? `$${(+item.depositAmount).toLocaleString()}` : "$0",
    status: item.status || "provisional",
    package: item.packageId || "",
    specialRequests: item.specialRequests || "",
  };
}

function mapBookingToApi(item: Partial<Booking>): any {
  return {
    client_name: item.clientName,
    client_email: item.clientEmail,
    client_phone: item.clientPhone,
    destination: item.destination,
    start_date: item.checkIn,
    end_date: item.checkOut,
    guests_count: item.guests,
    total_amount: item.totalPrice ? parseFloat(item.totalPrice.replace(/[$,]/g, "")) : 0,
    deposit_amount: item.depositPaid ? parseFloat(item.depositPaid.replace(/[$,]/g, "")) : 0,
    status: item.status || "provisional",
    special_requests: item.specialRequests,
  };
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  provisional: { label: "Provisional", color: "text-gray-600", bg: "bg-gray-100" },
  deposit_paid: { label: "Deposit Paid", color: "text-sky-700", bg: "bg-sky-50" },
  confirmed: { label: "Confirmed", color: "text-emerald-700", bg: "bg-emerald-50" },
  balance_due: { label: "Balance Due", color: "text-amber-700", bg: "bg-amber-50" },
  paid: { label: "Paid in Full", color: "text-teal-700", bg: "bg-teal-50" },
  in_progress: { label: "In Progress", color: "text-indigo-700", bg: "bg-indigo-50" },
  completed: { label: "Completed", color: "text-blue-700", bg: "bg-blue-50" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50" },
  refunded: { label: "Refunded", color: "text-purple-700", bg: "bg-purple-50" },
};

export default function AdminBookings() {
  const { data: bookings, loading, create, update, remove } = useApiData<Booking>("bookings", {
    mapFromApi: mapBooking,
    mapToApi: mapBookingToApi,
  });
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

  const stats = {
    total: bookings.length,
    active: bookings.filter(b => ["provisional","deposit_paid","confirmed","balance_due","paid","in_progress"].includes(b.status)).length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled" || b.status === "refunded").length,
  };

  const handleAdd = async () => {
    const result = await create(formData);
    if (result) {
      setShowModal(false);
      resetForm();
      showToast("Booking created successfully", "success");
    } else {
      showToast("Failed to create booking", "error");
    }
  };

  const handleEdit = async () => {
    if (!editBooking) return;
    const result = await update(editBooking.id, formData);
    if (result) {
      setEditBooking(null);
      setShowModal(false);
      showToast("Booking updated successfully", "success");
    } else {
      showToast("Failed to update booking", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      showToast("Booking deleted", "success");
    } else {
      showToast("Failed to delete booking", "error");
    }
  };

  const resetForm = () => setFormData({
    clientName: "", clientEmail: "", clientPhone: "", destination: "", property: "",
    checkIn: "", checkOut: "", guests: "2", totalPrice: "", depositPaid: "",
    status: "provisional", package: "", specialRequests: "",
  });
  const openAddModal = () => { setEditBooking(null); resetForm(); setShowModal(true); };
  const openEditModal = (booking: Booking) => { setEditBooking(booking); setFormData(booking); setShowModal(true); };

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Bookings</h1>
          <p className="text-earth mt-1">Manage all bookings, reservations, and guest details</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90">
          <Plus className="w-4 h-4" />Add Booking
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-earth text-sm">Loading bookings...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Bookings", value: stats.total },
              { label: "Active", value: stats.active },
              { label: "Completed", value: stats.completed },
              { label: "Cancelled", value: stats.cancelled },
            ].map(s => (
              <div key={s.label} className="bg-white p-4 border border-sand-light">
                <p className="text-2xl font-bold text-soft-black">{s.value}</p>
                <p className="text-xs text-earth">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
              <input
                type="text" placeholder="Search bookings..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white">
              <option value="all">All Status</option>
              {Object.entries(STATUS_STYLES).map(([key, s]) => (
                <option key={key} value={key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-sand-light overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-warm-white border-b border-sand-light">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-earth">Ref</th>
                  <th className="text-left px-4 py-3 font-medium text-earth">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-earth">Destination</th>
                  <th className="text-left px-4 py-3 font-medium text-earth">Dates</th>
                  <th className="text-left px-4 py-3 font-medium text-earth">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-earth">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-earth">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-light">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-warm-white">
                    <td className="px-4 py-3 font-medium text-gold">{b.ref}</td>
                    <td className="px-4 py-3 text-soft-black">{b.clientName}</td>
                    <td className="px-4 py-3 text-earth">{b.destination}</td>
                    <td className="px-4 py-3 text-earth">{b.checkIn} - {b.checkOut}</td>
                    <td className="px-4 py-3 font-medium text-soft-black">{b.totalPrice}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${STATUS_STYLES[b.status]?.bg || "bg-gray-50"} ${STATUS_STYLES[b.status]?.color || "text-gray-600"}`}>
                        {STATUS_STYLES[b.status]?.label || b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditModal(b)} className="text-xs text-gold mr-3">Edit</button>
                      <button onClick={() => setDeleteConfirm(b.id)} className="text-xs text-red-500">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              className="bg-cream border border-sand-light p-6 w-full max-w-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-soft-black">{editBooking ? "Edit Booking" : "Add New Booking"}</h2>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button>
              </div>

              <div className="space-y-4">
                {["clientName", "clientEmail", "clientPhone", "destination", "property"].map(f => (
                  <div key={f}>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">
                      {f.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                    </label>
                    <input
                      type={f.includes("Email") ? "email" : f.includes("Phone") ? "tel" : "text"}
                      value={formData[f] || ""}
                      onChange={e => setFormData({ ...formData, [f]: e.target.value })}
                      className="w-full px-4 py-2.5 border border-sand-light text-sm"
                    />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">Check-in</label>
                    <input type="date" value={formData.checkIn || ""} onChange={e => setFormData({ ...formData, checkIn: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">Check-out</label>
                    <input type="date" value={formData.checkOut || ""} onChange={e => setFormData({ ...formData, checkOut: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">Guests</label>
                    <input type="number" value={formData.guests || "2"} onChange={e => setFormData({ ...formData, guests: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">Total Price</label>
                    <input type="text" value={formData.totalPrice || ""} onChange={e => setFormData({ ...formData, totalPrice: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="$5,000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">Deposit Paid</label>
                    <input type="text" value={formData.depositPaid || ""} onChange={e => setFormData({ ...formData, depositPaid: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" placeholder="$2,500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-earth uppercase mb-2">Status</label>
                  <select value={formData.status || "provisional"} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm">
                    {Object.entries(STATUS_STYLES).map(([key, s]) => (
                      <option key={key} value={key}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-earth uppercase mb-2">Special Requests</label>
                  <textarea value={formData.specialRequests || ""} onChange={e => setFormData({ ...formData, specialRequests: e.target.value })} className="w-full px-4 py-2.5 border border-sand-light text-sm" rows={2} />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-sand-light">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button>
                <button onClick={editBooking ? handleEdit : handleAdd} className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium">
                  {editBooking ? "Save Changes" : "Create Booking"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <h3 className="text-lg font-bold text-soft-black mb-2">Confirm Delete</h3>
              <p className="text-sm text-earth mb-6">Delete this booking?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
