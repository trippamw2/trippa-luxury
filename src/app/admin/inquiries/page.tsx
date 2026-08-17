"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, Phone, MapPin, Calendar, Send, CheckCircle, X, AlertCircle, Trash2, UserPlus, Timer, MessageSquare, ArrowRight } from "lucide-react";
import { useApiData } from "@/lib/use-api-data";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  destination: string;
  date: string;
  status: "new" | "read" | "contacted" | "qualified" | "booked" | "closed";
  message: string;
  notes?: string;
  repliedAt?: string;
  assignedTo?: string | null;
  assignedName?: string | null;
  slaDueAt?: string;
  firstResponseAt?: string;
  responseCount?: number;
  guestProfileId?: string | null;
  convertedToBookingId?: string | null;
}

interface ApiInquiry {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  destination?: string;
  createdAt?: string;
  status?: string;
  message?: string;
  adminNotes?: string;
  lastContactedAt?: string;
  assignedTo?: string | null;
  slaDueAt?: string;
  firstResponseAt?: string;
  responseCount?: number;
  guestProfileId?: string | null;
  convertedToBookingId?: string | null;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

function mapInquiry(item: ApiInquiry): Inquiry {
  return {
    id: item.id,
    name: item.fullName || "",
    email: item.email || "",
    phone: item.phone || "",
    destination: item.destination || "",
    date: item.createdAt ? item.createdAt.split("T")[0] : "",
    status: (item.status || "new") as Inquiry["status"],
    message: item.message || "",
    notes: item.adminNotes || "",
    repliedAt: item.lastContactedAt || undefined,
    assignedTo: item.assignedTo || null,
    slaDueAt: item.slaDueAt || undefined,
    firstResponseAt: item.firstResponseAt || undefined,
    responseCount: item.responseCount ?? 0,
    guestProfileId: item.guestProfileId || null,
    convertedToBookingId: item.convertedToBookingId || null,
  };
}

function mapInquiryToApi(item: Partial<Inquiry>): Record<string, unknown> {
  return {
    full_name: item.name,
    email: item.email,
    phone: item.phone,
    destination: item.destination,
    message: item.message,
    status: item.status,
    admin_notes: item.notes,
    assigned_to: item.assignedTo ?? null,
  };
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "text-blue-700", bg: "bg-blue-50" },
  read: { label: "Read", color: "text-gray-600", bg: "bg-gray-50" },
  contacted: { label: "Contacted", color: "text-amber-700", bg: "bg-amber-50" },
  qualified: { label: "Qualified", color: "text-indigo-700", bg: "bg-indigo-50" },
  booked: { label: "Booked", color: "text-emerald-700", bg: "bg-emerald-50" },
  closed: { label: "Closed", color: "text-gray-400", bg: "bg-gray-100" },
};

export default function AdminInquiries() {
  const { data: inquiries, loading, update, remove } = useApiData("inquiries", {
    mapFromApi: mapInquiry,
    mapToApi: mapInquiryToApi,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load staff list lazily on first use of the details panel.
  const ensureStaff = async () => {
    if (staff.length > 0) return;
    try {
      const res = await fetch("/api/admin/staff");
      if (res.ok) {
        const body = (await res.json()) as { data: StaffMember[] };
        setStaff(body.data || []);
      }
    } catch {
      /* staff list is non-critical */
    }
  };

  const filtered = inquiries.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const slaBreached = (i: Inquiry) =>
    !!i.slaDueAt && i.status !== "booked" && i.status !== "closed" && new Date(i.slaDueAt) < new Date();

  const staffName = (id?: string | null) => {
    if (!id) return undefined;
    return staff.find(m => m.id === id)?.name;
  };

  const handleDelete = async (id: string) => {
    const target = inquiries.find(i => i.id === id);
    if (target?.convertedToBookingId) {
      showToast("This inquiry is linked to a booking and cannot be deleted", "error");
      return;
    }
    const ok = await remove(id);
    if (ok) {
      if (selected?.id === id) setSelected(null);
      showToast("Inquiry deleted", "success");
    } else {
      showToast("Failed to delete inquiry", "error");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const result = await update(id, { status: newStatus });
    if (result) {
      if (selected?.id === id) setSelected(result);
      showToast("Status updated to " + STATUS_STYLES[newStatus as keyof typeof STATUS_STYLES].label, "success");
    } else {
      showToast("Failed to update status", "error");
    }
  };

  const handleAssign = async (id: string, assigneeId: string | null) => {
    const result = await update(id, { assignedTo: assigneeId });
    if (result) {
      if (selected?.id === id) setSelected(result);
      showToast(assigneeId ? "Inquiry assigned" : "Assignment cleared", "success");
    } else {
      showToast("Failed to assign inquiry", "error");
    }
  };

  const handleSendReply = async () => {
    if (!selected || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${selected.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText, subject: replySubject }),
      });
      const body = await res.json().catch(() => ({ error: "Reply failed" }));
      if (!res.ok) {
        showToast(body.error || "Failed to send reply", "error");
        return;
      }
      const updated: Inquiry = {
        ...selected,
        status: "contacted",
        repliedAt: new Date().toISOString(),
        responseCount: (selected.responseCount ?? 0) + 1,
        firstResponseAt: selected.firstResponseAt || new Date().toISOString(),
        slaDueAt: selected.slaDueAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      setSelected(updated);
      setShowReplyModal(false);
      setReplyText("");
      setReplySubject("");
      showToast(`Reply sent to ${updated.email}`, "success");
    } catch {
      showToast("Failed to send reply", "error");
    } finally {
      setSending(false);
    }
  };

  const handleConvert = async () => {
    if (!selected || converting) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${selected.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await res.json().catch(() => ({ error: "Conversion failed" }));
      if (!res.ok) {
        showToast(body.error || "Failed to convert inquiry", "error");
        return;
      }
      const updated: Inquiry = {
        ...selected,
        status: "booked",
        convertedToBookingId: body.bookingId,
      };
      setSelected(updated);
      showToast(`Converted to booking ${body.bookingReference}`, "success");
    } catch {
      showToast("Failed to convert inquiry", "error");
    } finally {
      setConverting(false);
    }
  };

  const statusCounts = {
    total: inquiries.length,
    new: inquiries.filter(i => i.status === "new").length,
    booked: inquiries.filter(i => i.status === "booked").length,
    overdue: inquiries.filter(slaBreached).length,
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {toast && (<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>{toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}<span className="text-sm font-medium">{toast.message}</span></motion.div>)}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Inquiries</h1><p className="text-earth mt-1">Manage leads: reply via email, assign a concierge, track SLA, and convert to bookings</p></div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Inquiries", value: statusCounts.total },
          { label: "New (unread)", value: statusCounts.new },
          { label: "Converted to Booking", value: statusCounts.booked },
          { label: "SLA Breached", value: statusCounts.overdue },
        ].map(stat => (
          <div key={stat.label} className="bg-white p-4 border border-sand-light">
            <p className={`text-2xl font-bold ${stat.label === "SLA Breached" && stat.value > 0 ? "text-red-600" : "text-soft-black"}`}>{stat.value}</p>
            <p className="text-xs text-earth">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="bg-white border border-sand-light p-4 mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" /><input type="text" placeholder="Search inquiries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold" /></div></div>
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="text-earth text-sm">Loading inquiries...</div></div>
          ) : (
          <div className="bg-white border border-sand-light divide-y divide-sand-light">
            {filtered.map(inquiry => (
              <div key={inquiry.id} onClick={() => { setSelected(inquiry); void ensureStaff(); }} className={`p-4 cursor-pointer hover:bg-warm-white transition-colors ${selected?.id === inquiry.id ? "bg-warm-white" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-soft-black">{inquiry.name}</p>
                    <p className="text-xs text-earth">{inquiry.destination} • {inquiry.date}</p>
                    {staffName(inquiry.assignedTo) && <p className="text-[11px] text-gold mt-0.5">Assigned: {staffName(inquiry.assignedTo)}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${STATUS_STYLES[inquiry.status].bg} ${STATUS_STYLES[inquiry.status].color}`}>{STATUS_STYLES[inquiry.status].label}</span>
                    {slaBreached(inquiry) && <span className="text-[10px] text-red-600 flex items-center gap-1"><Timer className="w-3 h-3" />SLA overdue</span>}
                  </div>
                </div>
                <p className="text-sm text-earth mt-2 line-clamp-1">{inquiry.message}</p>
              </div>
            ))}
          </div>
          )}
        </div>

        {selected && (
          <div className="w-[400px] bg-white border border-sand-light p-6 h-fit">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-soft-black">Inquiry Details</h3><button onClick={() => setSelected(null)}><X className="w-5 h-5 text-earth" /></button></div>
            <div className="space-y-4">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-earth" /><span className="text-sm text-soft-black">{selected.email}</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-earth" /><span className="text-sm text-soft-black">{selected.phone}</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-earth" /><span className="text-sm text-soft-black capitalize">{selected.destination}</span></div>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-earth" /><span className="text-sm text-soft-black">{selected.date}</span></div>
            </div>

            <div className="mt-4 pt-4 border-t border-sand-light">
              <p className="text-xs text-earth uppercase mb-2">Assigned Concierge</p>
              <select
                value={selected.assignedTo || ""}
                onChange={(e) => handleAssign(selected.id, e.target.value || null)}
                className="w-full px-3 py-2 border border-sand-light text-sm"
              >
                <option value="">Unassigned</option>
                {staff.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                ))}
              </select>
            </div>

            <div className="mt-4 pt-4 border-t border-sand-light space-y-2">
              <p className="text-xs text-earth uppercase mb-2">Engagement</p>
              <p className="text-sm text-soft-black flex items-center gap-2"><MessageSquare className="w-4 h-4 text-earth" />{selected.responseCount ?? 0} response{(selected.responseCount ?? 0) === 1 ? "" : "s"}</p>
              {selected.firstResponseAt && <p className="text-sm text-soft-black flex items-center gap-2"><CheckCircle className="w-4 h-4 text-earth" />First response {new Date(selected.firstResponseAt).toLocaleString()}</p>}
              {selected.slaDueAt && (
                <p className={`text-sm flex items-center gap-2 ${slaBreached(selected) ? "text-red-600" : "text-soft-black"}`}>
                  <Timer className="w-4 h-4 text-earth" />SLA due {new Date(selected.slaDueAt).toLocaleString()}{slaBreached(selected) ? " (overdue)" : ""}
                </p>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-sand-light"><p className="text-xs text-earth uppercase mb-2">Message</p><p className="text-sm text-soft-black whitespace-pre-wrap">{selected.message}</p></div>
            {selected.repliedAt && (<div className="mt-4 p-3 bg-emerald-50 rounded"><p className="text-xs text-emerald-700">Last reply on {new Date(selected.repliedAt).toLocaleDateString()}</p></div>)}
            <div className="mt-4"><p className="text-xs text-earth uppercase mb-2">Status</p><select value={selected.status} onChange={(e) => handleStatusChange(selected.id, e.target.value)} className="w-full px-3 py-2 border border-sand-light text-sm">{Object.entries(STATUS_STYLES).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}</select></div>

            <div className="mt-4 space-y-2">
              {selected.convertedToBookingId ? (
                <a href="/admin/bookings" className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700">
                  <ArrowRight className="w-4 h-4" />View in Bookings
                </a>
              ) : (
                <button
                  onClick={handleConvert}
                  disabled={converting || selected.status === "booked" || selected.status === "closed"}
                  className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />{converting ? "Converting..." : "Convert to Guest + Booking"}
                </button>
              )}
              <button onClick={() => setShowReplyModal(true)} className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-gold text-soft-black text-sm font-medium rounded hover:bg-gold/90"><Send className="w-4 h-4" />Reply via Email</button>
              {selected.status !== "booked" && selected.status !== "closed" && (
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="flex w-full items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />Delete Inquiry
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showReplyModal && selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowReplyModal(false)}>
            <motion.div initial={{ scale: 0.95 }} className="bg-cream border border-sand-light w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0"><h2 className="text-lg font-bold text-soft-black">Reply to {selected.name}</h2><button onClick={() => setShowReplyModal(false)}><X className="w-5 h-5 text-earth" /></button></div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                <div className="bg-sand-light p-3 rounded"><p className="text-xs text-earth">To: {selected.email}</p></div>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Subject (optional)"
                  className="w-full px-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold"
                />
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} className="w-full px-4 py-3 border border-sand-light text-sm h-40" placeholder="Write your reply here... It will be sent as a real email from concierge@kivara.luxury" />
                <p className="text-[11px] text-earth">Sending marks the inquiry as contacted, records first-response time, and logs the exchange on the guest&apos;s communication timeline.</p>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0"><button onClick={() => setShowReplyModal(false)} className="flex-1 px-4 py-2 border border-sand-light text-earth text-sm">Cancel</button><button onClick={handleSendReply} disabled={!replyText.trim() || sending} className="flex-1 px-4 py-2 bg-gold text-soft-black text-sm font-medium rounded hover:bg-gold/90 disabled:opacity-50">{sending ? "Sending..." : "Send Reply"}</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
