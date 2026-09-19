"use client";

import { useState, useEffect } from "react";
import { Plus, ArrowRight, Clock, AlertCircle, CheckCircle, X, Calendar, User, Sparkles } from "lucide-react";

interface ConciergeRequest {
  id: string;
  category: string;
  request: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_staff_name: string | null;
  cost: number | null;
  selling_price: number | null;
  created_at: string;
}

interface ApiConcierge {
  id: string;
  category?: string;
  request?: string;
  description?: string | null;
  priority?: string;
  status?: string;
  due_date?: string | null;
  assigned_staff_name?: string | null;
  cost?: number | null;
  selling_price?: number | null;
  created_at?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-50 text-gray-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  acknowledged: "bg-yellow-50 text-yellow-700",
  in_progress: "bg-purple-50 text-purple-700",
  supplier_confirmed: "bg-green-50 text-green-700",
  completed: "bg-gray-50 text-gray-600",
  cancelled: "bg-red-50 text-red-700",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  airport_vip: <Sparkles className="w-4 h-4" />,
  flowers: <Sparkles className="w-4 h-4" />,
  private_dinner: <Sparkles className="w-4 h-4" />,
  photographer: <Sparkles className="w-4 h-4" />,
  proposal: <Sparkles className="w-4 h-4" />,
  birthday: <Sparkles className="w-4 h-4" />,
  anniversary: <Sparkles className="w-4 h-4" />,
  vehicle: <Sparkles className="w-4 h-4" />,
  dietary: <Sparkles className="w-4 h-4" />,
  spa: <Sparkles className="w-4 h-4" />,
  experience: <Sparkles className="w-4 h-4" />,
  other: <Sparkles className="w-4 h-4" />,
};

export default function AdminConcierge() {
  const [requests, setRequests] = useState<ConciergeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/concierge")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setRequests(json.data || []);
      })
      .catch((err) => console.error("Concierge fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  // Group by status
  const grouped = {
    new: requests.filter((r) => r.status === "new"),
    in_progress: requests.filter((r) => r.status === "in_progress" || r.status === "acknowledged"),
    completed: requests.filter((r) => r.status === "completed" || r.status === "supplier_confirmed"),
    cancelled: requests.filter((r) => r.status === "cancelled"),
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Concierge</h1>
        <p className="text-sm text-gray-500 mt-1">Special requests and guest services.</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div />
        <button className="flex items-center gap-2 px-4 py-2 bg-soft-black text-cream text-sm font-medium rounded-lg hover:bg-soft-black-light transition-colors">
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "New", count: grouped.new.length, color: "bg-blue-500" },
          { label: "In Progress", count: grouped.in_progress.length, color: "bg-purple-500" },
          { label: "Completed", count: grouped.completed.length, color: "bg-green-500" },
          { label: "Cancelled", count: grouped.cancelled.length, color: "bg-red-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 p-5">
            <div className={`w-3 h-3 ${s.color} rounded-full mb-3`} />
            <p className="text-2xl font-bold text-gray-900">{s.count}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Requests by status */}
      {Object.entries(grouped).map(([status, items]) => {
        if (items.length === 0) return null;
        return (
          <div key={status} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              {status.replace(/_/g, " ")} ({items.length})
            </h2>
            <div className="bg-white border border-gray-100">
              <div className="divide-y divide-gray-50">
                {items.map((r) => (
                  <div key={r.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-gold/10 flex items-center justify-center flex-shrink-0 rounded-full">
                        {CATEGORY_ICONS[r.category] || CATEGORY_ICONS.other}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.request}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[r.priority] || "bg-gray-50 text-gray-600"}`}>
                            {r.priority}
                          </span>
                          {r.due_date && <span><Calendar className="w-3 h-3 inline" /> {r.due_date}</span>}
                          {r.assigned_staff_name && <span><User className="w-3 h-3 inline" /> {r.assigned_staff_name}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {r.cost && (
                        <p className="text-sm font-medium text-gray-900">${r.cost}</p>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${STATUS_COLORS[r.status] || "bg-gray-50 text-gray-600"}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
