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

  useEffect(() => {
    fetch("/api/admin/proposals")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setProposals((json.data || []).map(mapApi));
      })
      .catch((err) => console.error("Proposals fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  function mapApi(item: ApiProposal): Proposal {
    return {
      id: item.id,
      proposal_reference: item.proposal_reference || "",
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
        <p className="text-sm text-gray-500 mt-1">Curated journey proposals sent to customers.</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div />
        <button className="flex items-center gap-2 px-4 py-2 bg-soft-black text-cream text-sm font-medium rounded-lg hover:bg-soft-black-light transition-colors">
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

      <div className="bg-white border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-gray-400">Loading proposals...</div>
          </div>
        ) : proposals.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No proposals yet.</div>
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
                        className="text-xs text-gold hover:text-gold-dark font-medium mr-3"
                      >
                        View
                      </button>
                      {p.status === "ready" && (
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
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
    </div>
  );
}
