"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ArrowRight,
  Filter,
  MoreHorizontal,
  UserPlus,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  traveller_type: string;
  lead_status: string;
  priority: string;
  estimated_budget: number | null;
  preferred_start_date: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  source: string;
  created_at: string;
  guest_profile_id: string | null;
  inquiry_id: string | null;
}

interface ApiLead {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  traveller_type?: string;
  lead_status?: string;
  priority?: string;
  estimated_budget?: number | null;
  preferred_start_date?: string | null;
  assigned_to?: string | null;
  assigned_name?: string | null;
  last_contacted_at?: string | null;
  next_follow_up?: string | null;
  source?: string;
  created_at?: string;
  guest_profile_id?: string | null;
  inquiry_id?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  contacted: "bg-yellow-50 text-yellow-700",
  qualified: "bg-purple-50 text-purple-700",
  discovery: "bg-indigo-50 text-indigo-700",
  journey_design: "bg-pink-50 text-pink-700",
  proposal_sent: "bg-amber-50 text-amber-700",
  negotiation: "bg-orange-50 text-orange-700",
  booking: "bg-green-50 text-green-700",
  lost: "bg-red-50 text-red-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-50 text-gray-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

export default function AdminLeads() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    country: "Zambia",
    traveller_type: "couple",
    priority: "medium",
    estimated_budget: "",
    source: "direct",
  });

  const fetchLeads = () => {
    setLoading(true);
    fetch("/api/admin/leads")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setLeads((json.data || []).map(mapApiLead));
      })
      .catch((err) => console.error("Leads fetch error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  function mapApiLead(item: ApiLead): Lead {
    return {
      id: item.id,
      full_name: item.full_name || "Unnamed Lead",
      email: item.email || "",
      phone: item.phone || "",
      country: item.country || "Zambia",
      traveller_type: item.traveller_type || "couple",
      lead_status: item.lead_status || "new",
      priority: item.priority || "medium",
      estimated_budget: item.estimated_budget ?? null,
      preferred_start_date: item.preferred_start_date || null,
      assigned_to: item.assigned_to || null,
      assigned_name: item.assigned_name || null,
      last_contacted_at: item.last_contacted_at || null,
      next_follow_up: item.next_follow_up || null,
      source: item.source || "direct",
      created_at: item.created_at || "",
      guest_profile_id: item.guest_profile_id || null,
      inquiry_id: item.inquiry_id || null,
    };
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          country: formData.country,
          traveller_type: formData.traveller_type,
          priority: formData.priority,
          estimated_budget: formData.estimated_budget ? parseFloat(formData.estimated_budget) : null,
          source: formData.source,
          lead_status: "new",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create lead");
      setIsModalOpen(false);
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        country: "Zambia",
        traveller_type: "couple",
        priority: "medium",
        estimated_budget: "",
        source: "direct",
      });
      fetchLeads();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = leads.filter(
    (l) =>
      l.full_name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">CRM pipeline — track prospects from inquiry to booking.</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-soft-black text-cream text-sm font-medium rounded-lg hover:bg-soft-black/90 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* Lead pipeline summary */}
      <div className="grid grid-cols-4 lg:grid-cols-9 gap-2 mb-8">
        {[
          { status: "new", label: "New", color: "bg-blue-500" },
          { status: "contacted", label: "Contacted", color: "bg-yellow-500" },
          { status: "qualified", label: "Qualified", color: "bg-purple-500" },
          { status: "discovery", label: "Discovery", color: "bg-indigo-500" },
          { status: "journey_design", label: "Design", color: "bg-pink-500" },
          { status: "proposal_sent", label: "Proposal", color: "bg-amber-500" },
          { status: "negotiation", label: "Negotiation", color: "bg-orange-500" },
          { status: "booking", label: "Booking", color: "bg-green-500" },
          { status: "lost", label: "Lost", color: "bg-red-500" },
        ].map((s) => (
          <div key={s.status} className="bg-white border border-gray-100 p-3 rounded-lg text-center">
            <div className={`w-2 h-2 ${s.color} rounded-full mx-auto mb-2`} />
            <p className="text-xs font-medium text-gray-900">{s.label}</p>
            <p className="text-lg font-bold text-gray-900">
              {leads.filter((l) => l.lead_status === s.status).length}
            </p>
          </div>
        ))}
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-gray-400">Loading leads...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No leads found. Click &quot;Add Lead&quot; to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Lead</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Priority</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Budget</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Source</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Next Follow-up</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Assigned</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Created</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gold/10 flex items-center justify-center rounded-full">
                          <span className="text-xs font-bold text-gold">{lead.full_name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{lead.full_name}</p>
                          <p className="text-xs text-gray-400">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${STATUS_COLORS[lead.lead_status] || "bg-gray-50 text-gray-600"}`}>
                        {lead.lead_status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${PRIORITY_COLORS[lead.priority] || "bg-gray-50 text-gray-600"}`}>
                        {lead.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {lead.estimated_budget ? `$${lead.estimated_budget.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{lead.source}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {lead.next_follow_up && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {lead.next_follow_up}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{lead.assigned_name || "Unassigned"}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ""}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => router.push(`/admin/leads/${lead.id}`)}
                        className="text-xs text-gold hover:text-gold-dark font-medium cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add New Lead</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arabella Sinclair"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="arabella@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+260 97..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Traveller Type</label>
                  <select
                    value={formData.traveller_type}
                    onChange={(e) => setFormData({ ...formData, traveller_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="couple">Couple</option>
                    <option value="family">Family</option>
                    <option value="honeymoon">Honeymoon</option>
                    <option value="solo">Solo</option>
                    <option value="group">Private Group</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Budget (USD)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={formData.estimated_budget}
                    onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                  <input
                    type="text"
                    placeholder="e.g. website, referral"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-soft-black text-cream text-sm font-medium rounded-lg hover:bg-soft-black/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Adding..." : "Save Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
