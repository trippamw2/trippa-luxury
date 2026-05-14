"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, Check, X, AlertCircle, CheckCircle } from "lucide-react";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  destination: string;
  date: string;
  status: "new" | "read" | "contacted" | "qualified" | "booked" | "closed";
  message: string;
}

const INITIAL_INQUIRIES: Inquiry[] = [
  { id: "1", name: "Sarah & James Mitchell", email: "sarah@example.com", phone: "+44 20 7123 4567", destination: "Lake Malawi & Zanzibar", date: "2 hours ago", status: "new", message: "We are dreaming of a honeymoon combining Lake Malawi and Zanzibar." },
  { id: "2", name: "Alexander & Natalia Petrov", email: "alex@example.com", phone: "+47 123 45 678", destination: "Zanzibar", date: "1 day ago", status: "new", message: "Interested in celebrating our anniversary at The Residence Zanzibar." },
  { id: "3", name: "David & Claire Mueller", email: "david@example.com", phone: "+49 30 1234 5678", destination: "Lake Malawi", date: "2 days ago", status: "read", message: "Considering Kaya Mawa for our 5-year anniversary." },
  { id: "4", name: "Emma & Thomas Chen", email: "emma@example.com", phone: "+61 2 1234 5678", destination: "South Luangwa", date: "3 days ago", status: "contacted", message: "We are booking our babymoon and want a luxury safari experience." },
  { id: "5", name: "Michael & Olivia Barnes", email: "michael@example.com", phone: "+1 212 555 0198", destination: "Lake Malawi & South Luangwa", date: "5 days ago", status: "qualified", message: "Interested in the Beach and Bush Escape package." },
  { id: "6", name: "Sophie & Marc Leclerc", email: "sophie@example.com", phone: "+33 1 23 45 67 89", destination: "South Luangwa", date: "1 week ago", status: "booked", message: "Finalizing our Romantic Safari Journey." },
];

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  read: "bg-gray-50 text-gray-600 border-gray-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  qualified: "bg-indigo-50 text-indigo-700 border-indigo-200",
  booked: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-gray-100 text-gray-400 border-gray-200",
};

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>(INITIAL_INQUIRIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = inquiries.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.email.toLowerCase().includes(searchQuery.toLowerCase()));

  const statusCounts = { total: inquiries.length, new: inquiries.filter(i => i.status === "new").length, booked: inquiries.filter(i => i.status === "booked").length };

  const handleStatusChange = (id: string, newStatus: string) => {
    setInquiries(inquiries.map(i => i.id === id ? { ...i, status: newStatus as Inquiry["status"] } : i));
    showToast("Status updated", "success");
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-soft-black">Inquiries</h1>
          <p className="text-sm text-earth mt-1">Manage customer leads and booking requests.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Inquiries", value: statusCounts.total, color: "text-soft-black" },
          { label: "New (unread)", value: statusCounts.new, color: "text-blue-700" },
          { label: "Converted to Booking", value: statusCounts.booked, color: "text-emerald-700" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-4 border border-sand-light">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-earth mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-sand-light p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
          <input type="text" placeholder="Search inquiries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-cream/50" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-sand-light p-12 text-center text-earth">No inquiries found.</div>
        ) : (
          filtered.map((inquiry, index) => (
            <motion.div key={inquiry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }} className="bg-white border border-sand-light p-5 hover:border-gold/30 transition-colors cursor-pointer" onClick={() => setSelected(selected === inquiry.id ? null : inquiry.id)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-soft-black">{inquiry.name}</h3>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium border ${STATUS_STYLES[inquiry.status]}`}>{inquiry.status}</span>
                  </div>
                  <p className="text-xs text-earth">{inquiry.email} · {inquiry.destination}</p>
                </div>
                <span className="text-xs text-earth-light shrink-0">{inquiry.date}</span>
              </div>

              {selected === inquiry.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-sand-light">
                  <p className="text-sm text-earth leading-relaxed mb-4">{inquiry.message}</p>
                  <div className="flex flex-wrap items-center gap-4">
                    <a href={`mailto:${inquiry.email}`} className="text-xs text-gold hover:text-gold-dark flex items-center gap-1"><Mail className="w-3 h-3" /> Reply via Email</a>
                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange(inquiry.id, "contacted"); }} className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"><Check className="w-3 h-3" /> Mark as Contacted</button>
                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange(inquiry.id, "closed"); }} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"><X className="w-3 h-3" /> Close</button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}