"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, FileText, Mail, Send, Printer, Loader2, Edit2, Trash2, Calendar, CalendarDays, AlertTriangle, RefreshCw, Download } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";
import { useToast } from "@/app/admin/components/Toast";
import { DataTable, type Column } from "@/app/admin/components/DataTable";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { FormInput, FormTextarea, FormSelect, FormGroup } from "@/app/admin/components/FormField";

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
  depositMethod?: string;
  swiftCode?: string;
  depositNotes?: string;
}

/** Raw row shape returned by the bookings admin API (DB column names). */
interface ApiBooking {
  id: string;
  bookingReference?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  destination?: string | null;
  propertyId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  guestsCount?: number | null;
  totalAmount?: number | null;
  depositAmount?: number | null;
  status?: string | null;
  packageId?: string | null;
  specialRequests?: string | null;
  depositMethod?: string | null;
  swiftConfirmationCode?: string | null;
  depositNotes?: string | null;
}

interface BookingFormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  destination: string;
  property: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  totalPrice: string;
  depositPaid: string;
  status: string;
  package: string;
  specialRequests: string;
  depositMethod: string;
  swiftCode: string;
  depositNotes: string;
}

function emptyFormData(): BookingFormData {
  return {
    clientName: "", clientEmail: "", clientPhone: "", destination: "", property: "",
    checkIn: "", checkOut: "", guests: "2", totalPrice: "", depositPaid: "",
    status: "provisional", package: "", specialRequests: "",
    depositMethod: "", swiftCode: "", depositNotes: "",
  };
}

function bookingToFormData(booking: Booking): BookingFormData {
  return {
    ...emptyFormData(),
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    clientPhone: booking.clientPhone,
    destination: booking.destination,
    property: booking.property,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: String(booking.guests),
    totalPrice: booking.totalPrice,
    depositPaid: booking.depositPaid,
    status: booking.status,
    package: booking.package || "",
    specialRequests: booking.specialRequests || "",
    depositMethod: booking.depositMethod || "",
    swiftCode: booking.swiftCode || "",
    depositNotes: booking.depositNotes || "",
  };
}

interface BookingApiPayload {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  guests_count?: number;
  total_amount?: number;
  deposit_amount?: number;
  status?: string;
  special_requests?: string;
  deposit_method?: string | null;
  swift_confirmation_code?: string | null;
  deposit_notes?: string | null;
}

function mapBooking(item: ApiBooking): Booking {
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
    status: (item.status as BookingStatus) || "provisional",
    package: item.packageId || "",
    specialRequests: item.specialRequests || "",
    depositMethod: item.depositMethod || "",
    swiftCode: item.swiftConfirmationCode || "",
    depositNotes: item.depositNotes || "",
  };
}

function mapBookingToApi(item: Partial<Booking>): BookingApiPayload {
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
    deposit_method: item.depositMethod || null,
    swift_confirmation_code: item.swiftCode || null,
    deposit_notes: item.depositNotes || null,
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

const STATUS_OPTIONS = Object.entries(STATUS_STYLES).map(([value, s]) => ({ value, label: s.label }));

export default function AdminBookings() {
  const { data: bookings, loading, create, update, remove } = useApiData("bookings", {
    mapFromApi: mapBooking,
    mapToApi: mapBookingToApi,
  });
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookingFormData>(emptyFormData);
  const [docMenu, setDocMenu] = useState<string | null>(null);
  const [emailMenu, setEmailMenu] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);

  // ─── Provisional holds ─────────────────────────────
  const [staleProvisionals, setStaleProvisionals] = useState<number>(0);
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/admin/bookings/provisional-holds");
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setStaleProvisionals(json.count || 0);
        }
      } catch {
        // Silently fail
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReleaseProvisionals = async () => {
    setReleasing(true);
    try {
      const res = await fetch("/api/admin/bookings/provisional-holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: false, older_than_hours: 48 }),
      });
      if (res.ok) {
        toast("Stale provisional bookings released", "success");
        setStaleProvisionals(0);
        // Refresh booking list
        window.location.reload();
      }
    } catch {
      toast("Failed to release provisional holds", "error");
    }
    setReleasing(false);
  };

  const stats = useMemo(() => ({
    total: bookings.length,
    active: bookings.filter(b => ["provisional","deposit_paid","confirmed","balance_due","paid","in_progress"].includes(b.status)).length,
    completed: bookings.filter(b => b.status === "completed").length,
    cancelled: bookings.filter(b => b.status === "cancelled" || b.status === "refunded").length,
  }), [bookings]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return bookings;
    return bookings.filter(b => b.status === statusFilter);
  }, [bookings, statusFilter]);

  // ─── CRUD Handlers ──────────────────────────────────
  const handleAdd = async () => {
    const result = await create(formData);
    if (result) {
      setShowModal(false);
      resetForm();
      toast("Booking created successfully", "success");
    } else {
      toast("Failed to create booking", "error");
    }
  };

  const handleEdit = async () => {
    if (!editBooking) return;
    const result = await update(editBooking.id, formData);
    if (result) {
      setEditBooking(null);
      setShowModal(false);
      toast("Booking updated successfully", "success");
    } else {
      toast("Failed to update booking", "error");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      setDeleteConfirm(null);
      toast("Booking deleted", "success");
    } else {
      toast("Failed to delete booking", "error");
    }
  };

  // ─── Document Generation ────────────────────────────
  const DOCUMENT_TYPES = ["invoice", "receipt", "itinerary", "welcome", "travel-brief", "payment-reminder", "thank-you"];

  const getDocUrl = (booking: Booking, docType: string) => {
    const params = new URLSearchParams({
      type: docType,
      bookingRef: booking.ref,
      clientName: booking.clientName,
      destination: booking.destination,
      totalAmount: booking.totalPrice,
      depositAmount: booking.depositPaid,
      startDate: booking.checkIn,
      endDate: booking.checkOut,
      guests: String(booking.guests),
    });
    return `/api/documents/download?${params}`;
  };

  const handleGenerateDoc = async (booking: Booking, docType: string) => {
    setGeneratingDoc(docType);
    setDocMenu(null);
    try {
      // Open download in new tab (triggers browser download)
      window.open(getDocUrl(booking, docType), "_blank");
      toast(`${docType.charAt(0).toUpperCase() + docType.slice(1)} downloaded`, "success");
    } catch (err: unknown) {
      toast(`Failed to generate ${docType}: ${err instanceof Error ? err.message : "unknown error"}`, "error");
    }
    setGeneratingDoc(null);
  };

  // ─── Email Sending ──────────────────────────────────
  const EMAIL_TYPES = [
    { value: "confirmation", label: "Booking Confirmation" },
    { value: "receipt", label: "Payment Receipt" },
    { value: "reminder", label: "Payment Reminder" },
  ];

  const handleSendEmail = async (booking: Booking, type: string) => {
    setSendingEmail(type);
    setEmailMenu(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send email");
      }
      toast(`${type === "confirmation" ? "Confirmation" : type === "receipt" ? "Receipt" : "Reminder"} sent to ${booking.clientEmail}`, "success");
    } catch (err: unknown) {
      toast(`Failed to send email: ${err instanceof Error ? err.message : "unknown error"}`, "error");
    }
    setSendingEmail(null);
  };

  const resetForm = () => setFormData(emptyFormData());
  const openAddModal = () => { setEditBooking(null); resetForm(); setShowModal(true); };
  const openEditModal = (booking: Booking) => { setEditBooking(booking); setFormData(bookingToFormData(booking)); setShowModal(true); };

  // ─── Table Columns ──────────────────────────────────
  const columns: Column<Booking>[] = [
    {
      key: "ref",
      header: "Ref",
      className: "font-medium text-gold font-mono text-xs",
      render: (b) => b.ref,
    },
    {
      key: "clientName",
      header: "Client",
      render: (b) => (
        <div>
          <p className="font-medium text-soft-black">{b.clientName}</p>
          <p className="text-xs text-earth">{b.clientEmail}</p>
        </div>
      ),
    },
    {
      key: "destination",
      header: "Destination",
      render: (b) => <span className="text-earth">{b.destination}</span>,
    },
    {
      key: "checkIn",
      header: "Dates",
      render: (b) => (
        <span className="text-earth text-xs">
          {b.checkIn} – {b.checkOut}
        </span>
      ),
    },
    {
      key: "totalPrice",
      header: "Amount",
      render: (b) => <span className="font-medium text-soft-black">{b.totalPrice}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (b) => {
        const s = STATUS_STYLES[b.status];
        return (
          <span className={`inline-flex px-2 py-1 text-xs rounded ${s?.bg || "bg-gray-50"} ${s?.color || "text-gray-600"}`}>
            {s?.label || b.status}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      sortable: false,
      render: (b) => (
        <div className="flex items-center justify-end gap-1">
          {/* Download iCal */}
          <a
            href={`/api/admin/bookings/${b.id}/ical`}
            download
            className="p-1.5 text-xs text-earth hover:text-soft-black hover:bg-sand-light rounded inline-flex"
            title="Download iCal"
          >
            <CalendarDays className="w-3.5 h-3.5" />
          </a>

          {/* Document dropdown */}
          <div className="relative">
            <button onClick={() => setDocMenu(docMenu === b.id ? null : b.id)}
              className="p-1.5 text-xs text-earth hover:text-soft-black hover:bg-sand-light rounded">
              <FileText className="w-3.5 h-3.5" />
            </button>
            {docMenu === b.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDocMenu(null)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-sand-light shadow-lg min-w-[140px]">
                  {DOCUMENT_TYPES.map((dt) => (
                    <button key={dt} onClick={() => handleGenerateDoc(b, dt)}
                      disabled={generatingDoc === dt}
                      className="block w-full text-left px-3 py-2 text-xs text-earth hover:bg-warm-white disabled:opacity-50 flex items-center gap-2">
                      {generatingDoc === dt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                      {dt.charAt(0).toUpperCase() + dt.slice(1).replace("-", " ")}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Email dropdown */}
          <div className="relative">
            <button onClick={() => setEmailMenu(emailMenu === b.id ? null : b.id)}
              className="p-1.5 text-xs text-earth hover:text-soft-black hover:bg-sand-light rounded">
              <Mail className="w-3.5 h-3.5" />
            </button>
            {emailMenu === b.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setEmailMenu(null)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-sand-light shadow-lg min-w-[160px]">
                  {EMAIL_TYPES.map((et) => (
                    <button key={et.value} onClick={() => handleSendEmail(b, et.value)}
                      disabled={sendingEmail === et.value}
                      className="block w-full text-left px-3 py-2 text-xs text-earth hover:bg-warm-white disabled:opacity-50 flex items-center gap-2">
                      {sendingEmail === et.value ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      {et.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button onClick={() => openEditModal(b)} className="p-1.5 text-xs text-gold hover:bg-sand-light rounded">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setDeleteConfirm(b.id)} className="p-1.5 text-xs text-red-400 hover:bg-sand-light rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Bookings</h1>
          <p className="text-earth mt-1">Manage all bookings, reservations, and guest details</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/admin/bookings/export${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`}
            download
            className="flex items-center gap-2 px-4 py-2 border border-sand-light text-earth font-medium rounded hover:bg-warm-white transition-colors text-sm"
          >
            <Download className="w-4 h-4" />Export CSV
          </a>
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-gold text-soft-black font-medium rounded hover:bg-gold/90 transition-colors">
            <Plus className="w-4 h-4" />Add Booking
          </button>
        </div>
      </div>

      {/* Stats */}
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

      {/* Stale provisional warning */}
      {staleProvisionals > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-4 py-3 mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-800">
              <strong>{staleProvisionals}</strong> provisional booking{staleProvisionals !== 1 ? "s" : ""} older than 48 hours : pending release.
            </p>
          </div>
          <button
            onClick={handleReleaseProvisionals}
            disabled={releasing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {releasing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Release All
          </button>
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-4 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white">
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search by client name, ref, destination..."
        loading={loading}
        exportable
        exportFilename="kivara-bookings"
        importable
        importTable="bookings"
        emptyState={
          <EmptyState
            icon={Calendar}
            title="No bookings yet"
            description={statusFilter !== "all" ? "No bookings match the selected status." : "Create your first booking to get started."}
            action={statusFilter === "all" ? { label: "Add Booking", onClick: openAddModal } : undefined}
          />
        }
      />

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
            className="bg-cream border border-sand-light w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
              <h2 className="text-xl font-bold text-soft-black">{editBooking ? "Edit Booking" : "Add New Booking"}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-earth" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              <FormGroup>
                <FormInput label="Client Name" name="clientName" value={formData.clientName || ""} onChange={e => setFormData({ ...formData, clientName: e.target.value })} required />
                <FormInput label="Client Email" name="clientEmail" type="email" value={formData.clientEmail || ""} onChange={e => setFormData({ ...formData, clientEmail: e.target.value })} />
              </FormGroup>
              <FormGroup>
                <FormInput label="Client Phone" name="clientPhone" type="tel" value={formData.clientPhone || ""} onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} />
                <FormInput label="Destination" name="destination" value={formData.destination || ""} onChange={e => setFormData({ ...formData, destination: e.target.value })} />
              </FormGroup>

              <FormGroup>
                <FormInput label="Check-in" name="checkIn" type="date" value={formData.checkIn || ""} onChange={e => setFormData({ ...formData, checkIn: e.target.value })} />
                <FormInput label="Check-out" name="checkOut" type="date" value={formData.checkOut || ""} onChange={e => setFormData({ ...formData, checkOut: e.target.value })} />
              </FormGroup>

              <FormGroup>
                <FormInput label="Guests" name="guests" type="number" value={formData.guests || "2"} onChange={e => setFormData({ ...formData, guests: e.target.value })} />
                <FormInput label="Total Price" name="totalPrice" value={formData.totalPrice || ""} onChange={e => setFormData({ ...formData, totalPrice: e.target.value })} placeholder="$5,000" />
                <FormInput label="Deposit Paid" name="depositPaid" value={formData.depositPaid || ""} onChange={e => setFormData({ ...formData, depositPaid: e.target.value })} placeholder="$2,500" />
              </FormGroup>

              <FormGroup>
                <FormSelect label="Deposit Method" name="depositMethod" value={formData.depositMethod || ""} onChange={e => setFormData({ ...formData, depositMethod: e.target.value })}
                  placeholder="Select method..."
                  options={[
                    { value: "swift", label: "SWIFT / Wire Transfer" },
                    { value: "credit_card", label: "Credit Card" },
                    { value: "bank_transfer", label: "Bank Transfer" },
                    { value: "cash", label: "Cash" },
                    { value: "other", label: "Other" },
                  ]}
                />
                <FormInput label="SWIFT Code" name="swiftCode" value={formData.swiftCode || ""} onChange={e => setFormData({ ...formData, swiftCode: e.target.value })} placeholder="e.g. SFTRO12345" />
              </FormGroup>

              <FormTextarea label="Deposit Notes" name="depositNotes" value={formData.depositNotes || ""} onChange={e => setFormData({ ...formData, depositNotes: e.target.value })} rows={2} placeholder="SWIFT reference, payment instructions, notes..." />

              <FormSelect label="Status" name="status" value={formData.status || "provisional"} onChange={e => setFormData({ ...formData, status: e.target.value })} options={STATUS_OPTIONS} />

              <FormTextarea label="Special Requests" name="specialRequests" value={formData.specialRequests || ""} onChange={e => setFormData({ ...formData, specialRequests: e.target.value })} rows={2} />
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm transition-colors hover:bg-warm-white">Cancel</button>
              <button onClick={editBooking ? handleEdit : handleAdd} className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors">
                {editBooking ? "Save Changes" : "Create Booking"}
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
              <h3 className="text-lg font-bold text-soft-black mb-2">Confirm Delete</h3>
              <p className="text-sm text-earth mb-6">Delete this booking?</p>
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
