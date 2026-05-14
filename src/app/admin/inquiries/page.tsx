"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Mail, Phone, MapPin, Search, CheckCircle, XCircle, Eye } from "lucide-react";

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

const MOCK_INQUIRIES: Inquiry[] = [
  { id: "1", name: "Sarah & James Mitchell", email: "sarah@example.com", phone: "+44 20 7123 4567", destination: "Lake Malawi & Zanzibar", date: "2 hours ago", status: "new", message: "We are dreaming of a honeymoon combining Lake Malawi and Zanzibar. Looking for a 10-12 day itinerary with the most romantic properties available." },
  { id: "2", name: "Alexander & Natalia Petrov", email: "alex@example.com", phone: "+47 123 45 678", destination: "Zanzibar", date: "1 day ago", status: "new", message: "Interested in celebrating our anniversary at The Residence Zanzibar. Would like villa options and spa package details." },
  { id: "3", name: "David & Claire Mueller", email: "david@example.com", phone: "+49 30 1234 5678", destination: "Lake Malawi", date: "2 days ago", status: "read", message: "Considering Kaya Mawa for our 5-year anniversary. Please send availability for August and package options." },
  { id: "4", name: "Emma & Thomas Chen", email: "emma@example.com", phone: "+61 2 1234 5678", destination: "South Luangwa", date: "3 days ago", status: "contacted", message: "We are booking our babymoon and want a luxury safari experience. Puku Ridge looks perfect. Dietary restrictions: vegetarian." },
  { id: "5", name: "Michael & Olivia Barnes", email: "michael@example.com", phone: "+1 212 555 0198", destination: "Lake Malawi & South Luangwa", date: "5 days ago", status: "qualified", message: "Interested in the Beach and Bush Escape package. Would like to customize with additional nights at Kaya Mawa." },
  { id: "6", name: "Sophie & Marc Leclerc", email: "sophie@example.com", phone: "+33 1 23 45 67 89", destination: "South Luangwa", date: "1 week ago", status: "booked", message: "Finalizing our Romantic Safari Journey. All documents received and deposit paid." },
];

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  read: "bg-gray-50 text-gray-600",
  contacted: "bg-amber-50 text-amber-700",
  qualified: "bg-indigo-50 text-indigo-700",
  booked: "bg-emerald-50 text-emerald-700",
  closed: "bg-gray-100 text-gray-400",
};

export default function AdminInquiries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = MOCK_INQUIRIES.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusCounts = {
    total: MOCK_INQUIRIES.length,
    new: MOCK_INQUIRIES.filter((i) => i.status === "new").length,
    booked: MOCK_INQUIRIES.filter((i) => i.status === "booked").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer leads and booking requests.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Inquiries", value: statusCounts.total, color: "text-gray-900" },
          { label: "New (unread)", value: statusCounts.new, color: "text-blue-600" },
          { label: "Converted to Booking", value: statusCounts.booked, color: "text-emerald-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-4 border border-gray-100">
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search inquiries by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-gray-100 p-12 text-center">
            <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No inquiries match your search.</p>
          </div>
        ) : (
          filtered.map((inquiry, index) => (
            <motion.div
              key={inquiry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="bg-white border border-gray-100 p-5 hover:border-gray-200 transition-colors cursor-pointer"
              onClick={() => setSelected(selected === inquiry.id ? null : inquiry.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">{inquiry.name}</h3>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[inquiry.status]}`}>
                      {inquiry.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{inquiry.email} &middot; {inquiry.destination}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{inquiry.date}</span>
              </div>

              {selected === inquiry.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 pt-4 border-t border-gray-50"
                >
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">{inquiry.message}</p>
                  <div className="flex items-center gap-4">
                    <a href={`mailto:${inquiry.email}`} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Reply via Email
                    </a>
                    <button className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Mark as Contacted
                    </button>
                    <button className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Close
                    </button>
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
