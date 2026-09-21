"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, Calendar, DollarSign, Eye, Send, CheckCircle, X, Clock, User } from "lucide-react";

interface Proposal {
  id: string;
  proposal_reference: string;
  title: string;
  status: string;
  total_investment: number | null;
  currency: string;
  sent_date: string | null;
  viewed_date: string | null;
  accepted_date: string | null;
  expiry_date: string | null;
  customer_name: string | null;
  journey_name: string | null;
  created_at: string;
}

interface ApiProposal {
  id: string;
  proposal_reference?: string;
  title?: string;
  status?: string;
  total_investment?: number | null;
  currency?: string;
  sent_date?: string | null;
  viewed_date?: string | null;
  accepted_date?: string | null;
  expiry_date?: string | null;
  customer_name?: string | null;
  journey_name?: string | null;
  created_at?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-50 text-gray-700",
  ready: "bg-blue-50 text-blue-700",
  sent: "bg-purple-50 text-purple-700",
  viewed: "bg-indigo-50 text-indigo-700",
  accepted: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
  expired: "bg-amber-50 text-amber-700",
};

export default function AdminProposals() {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    customer_name: "",
    journey_name: "",
    total_investment: "",
    currency: "USD",
  });

  const fetchProposals = () => {
    setLoading(true);
    fetch("/api/admin/proposals")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setProposals((json.data || []).map(mapApi));
      })
      .catch((err) => console.error("Proposals fetch error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  function mapApi(item: ApiProposal): Proposal {
    return {
      id: item.id,
      proposal_reference: item.proposal_reference || `PROP-${Math.floor(1000 + Math.random() * 9000)}`,
      title: item.title || "",
      status: item.status || "draft",
      total_investment: item.total_investment ?? null,
      currency: item.currency || "USD",
      sent_date: item.sent_date || null,
      viewed_date: item.viewed_date || null,
      accepted_date: item.accepted_date || null,
      expiry_date: item.expiry_date || null,
      customer_name: item.customer_name || null,
      journey_name: item.journey_name || null,
      created_at: item.created_at || "",
    };
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          customer_name: formData.customer_name,
          journey_name: formData.journey_name,
          total_investment: formData.total_investment ? parseFloat(formData.total_investment) : null,
          currency: formData.currency,
          status: "draft",
          proposal_reference: `KIV-${Math.floor(100000 + Math.random() * 900000)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create proposal");
      setIsModalOpen(false);
      setFormData({ title: "", customer_name: "", journey_name: "", total_investment: "", currency: "USD" });
      fetchProposals();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create proposal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
          <p className="text-sm text-gray-500 mt-1">Curated journey proposals sent to customers.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-soft-black text-cream text-sm font-medium rounded-lg hover:bg-soft-black/90 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Proposal
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="bg-white border border-gray-100 p-3 rounded-lg text-center">
            <p className="text-xs font-medium text-gray-900 capitalize">{status}</p>
            <p className="text-lg font-bold text-gray-900">
              {proposals.filter((p) => p.status === status).length}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-gray-400">Loading proposals...</div>
          </div>
        ) : proposals.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No proposals yet. Click &quot;Create Proposal&quot; to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Reference</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Title</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Journey</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Investment</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Sent</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Expiry</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {proposals.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gold font-medium">{p.proposal_reference}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{p.title}</td>
                    <td className="px-5 py-3 text-gray-500">{p.customer_name || "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{p.journey_name || "—"}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {p.total_investment ? `${p.currency} ${p.total_investment.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${STATUS_COLORS[p.status] || "bg-gray-50 text-gray-600"}`}>
                        {p.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {p.sent_date && (
                        <span className="flex items-center gap-1">
                          <Send className="w-3 h-3" />
                          {new Date(p.sent_date).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {p.expiry_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.expiry_date}</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => router.push(`/admin/proposals/${p.id}`)}
                        className="text-xs text-gold hover:text-gold-dark font-medium mr-3 cursor-pointer"
                      >
                        View
                      </button>
                      {p.status === "ready" && (
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
                          Send
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Create New Proposal</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Proposal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zambian Safari & Zanzibar Escape"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor & Harrison Vance"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Journey Name / Theme</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. South Luangwa & Mnemba Island"
                  value={formData.journey_name}
                  onChange={(e) => setFormData({ ...formData, journey_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Total Investment</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 24500"
                    value={formData.total_investment}
                    onChange={(e) => setFormData({ ...formData, total_investment: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
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
                  {submitting ? "Creating..." : "Save Proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
