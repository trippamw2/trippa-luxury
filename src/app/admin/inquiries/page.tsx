"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, Phone, MapPin, Calendar, Send, CheckCircle, X, AlertCircle, MessageSquare, Edit2, Trash2 } from "lucide-react";
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
}

function mapInquiry(item: any): Inquiry {
  return {
    id: item.id,
    name: item.fullName || "",
    email: item.email || "",
    phone: item.phone || "",
    destination: item.destination || "",
    date: item.createdAt ? item.createdAt.split("T")[0] : "",
    status: item.status || "new",
    message: item.message || "",
    notes: item.adminNotes || "",
    repliedAt: item.lastContactedAt || undefined,
  };
}

function mapInquiryToApi(item: Partial<Inquiry>): any {
  return {
    full_name: item.name,
    email: item.email,
    phone: item.phone,
    destination: item.destination,
    message: item.message,
    status: item.status,
    admin_notes: item.notes,
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
  const { data: inquiries, loading, update, remove } = useApiData<Inquiry>("inquiries", {
    mapFromApi: mapInquiry,
    mapToApi: mapInquiryToApi,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = inquiries.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStatusChange = async (id: string, newStatus: string) => {
    const result = await update(id, { status: newStatus });
    if (result) {
      if (selected?.id === id) setSelected({ ...selected, status: newStatus as Inquiry["status"] });
      showToast("Status updated to " + STATUS_STYLES[newStatus as keyof typeof STATUS_STYLES].label, "success");
    } else {
      showToast("Failed to update status", "error");
    }
  };

  const handleSendReply = () => {
    if (!selected || !replyText.trim()) return;
    setSelected({ ...selected, status: "contacted", repliedAt: new Date().toISOString() });
    update(selected.id, { status: "contacted", notes: replyText });
    setShowReplyModal(false);
    setReplyText("");
    showToast("Reply sent to " + selected.email, "success");
  };

  const handleDelete = async (id: string) => {
    const ok = await remove(id);
    if (ok) {
      if (selected?.id === id) setSelected(null);
      showToast("Inquiry deleted", "success");
    } else {
      showToast("Failed to delete inquiry", "error");
    }
  };

  const statusCounts = { total: inquiries.length, new: inquiries.filter(i => i.status === "new").length, booked: inquiries.filter(i => i.status === "booked").length };

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {toast && (<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>{toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}<span className="text-sm font-medium">{toast.message}</span></motion.div>)}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-heading font-bold text-soft-black">Inquiries</h1><p className="text-earth mt-1">Manage customer leads, reply via email, and track status</p></div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{ label: "Total Inquiries", value: statusCounts.total }, { label: "New (unread)", value: statusCounts.new }, { label: "Converted to Booking", value: statusCounts.booked }].map(stat => (<div key={stat.label} className="bg-white p-4 border border-sand-light"><p className="text-2xl font-bold text-soft-black">{stat.value}</p><p className="text-xs text-earth">{stat.label}</p></div>))}
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="bg-white border border-sand-light p-4 mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" /><input type="text" placeholder="Search inquiries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold" /></div></div>
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="text-earth text-sm">Loading inquiries...</div></div>
          ) : (
          <div className="bg-white border border-sand-light divide-y divide-sand-light">
            {filtered.map(inquiry => (
              <div key={inquiry.id} onClick={() => setSelected(inquiry)} className={`p-4 cursor-pointer hover:bg-warm-white transition-colors ${selected?.id === inquiry.id ? "bg-warm-white" : ""}`}>
                <div className="flex items-start justify-between">
                  <div><p className="font-medium text-soft-black">{inquiry.name}</p><p className="text-xs text-earth">{inquiry.destination} • {inquiry.date}</p></div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${STATUS_STYLES[inquiry.status].bg} ${STATUS_STYLES[inquiry.status].color}`}>{STATUS_STYLES[inquiry.status].label}</span>
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
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-earth" /><span className="text-sm text-soft-black">{selected.destination}</span></div>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-earth" /><span className="text-sm text-soft-black">{selected.date}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-sand-light"><p className="text-xs text-earth uppercase mb-2">Message</p><p className="text-sm text-soft-black">{selected.message}</p></div>
            {selected.repliedAt && (<div className="mt-4 p-3 bg-emerald-50 rounded"><p className="text-xs text-emerald-700">Replied on {new Date(selected.repliedAt).toLocaleDateString()}</p></div>)}
            <div className="mt-4"><p className="text-xs text-earth uppercase mb-2">Status</p><select value={selected.status} onChange={(e) => handleStatusChange(selected.id, e.target.value)} className="w-full px-3 py-2 border border-sand-light text-sm">{Object.entries(STATUS_STYLES).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}</select></div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowReplyModal(true)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gold text-soft-black text-sm font-medium rounded hover:bg-gold/90"><Send className="w-4 h-4" />Reply via Email</button>
              <button onClick={() => handleDelete(selected.id)} className="px-3 py-2 border border-red-200 text-red-600 rounded hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
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
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} className="w-full px-4 py-3 border border-sand-light text-sm h-40" placeholder="Write your reply here..." />
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0"><button onClick={() => setShowReplyModal(false)} className="flex-1 px-4 py-2 border border-sand-light text-earth text-sm">Cancel</button><button onClick={handleSendReply} disabled={!replyText.trim()} className="flex-1 px-4 py-2 bg-gold text-soft-black text-sm font-medium rounded hover:bg-gold/90 disabled:opacity-50">Send Reply</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
