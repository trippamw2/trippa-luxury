"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, RefreshCw, ShieldCheck, ArrowUpRight, Search } from "lucide-react";

// ─── Type mirror for the Agent Registry API (§23) ─────────────────────────

type AgentTool =
  | "llm"
  | "read_inquiries"
  | "read_bookings"
  | "read_suppliers"
  | "read_guests"
  | "read_finance"
  | "read_analytics"
  | "read_products"
  | "read_knowledge"
  | "send_email"
  | "generate_document"
  | "update_crm"
  | "none";

interface AgentSpec {
  name: string;
  department: string;
  objective: string;
  scope: string;
  tools: AgentTool[];
  knowledge: string[];
  permissions: string;
  output: string;
  escalation: string;
  successMetrics: string[];
}

const TOOL_LABEL: Record<AgentTool, string> = {
  llm: "LLM",
  read_inquiries: "Read inquiries",
  read_bookings: "Read bookings",
  read_suppliers: "Read suppliers",
  read_guests: "Read guests",
  read_finance: "Read finance",
  read_analytics: "Read analytics",
  read_products: "Read products",
  read_knowledge: "Read knowledge",
  send_email: "Send email",
  generate_document: "Generate document",
  update_crm: "Update CRM",
  none: "—",
};

// ─── Page ────────────────────────────────────────────────────────────────

export default function AgentRegistryPage() {
  const [agents, setAgents] = useState<AgentSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/agent-registry");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAgents(json.agents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent registry");
    } finally {
      setLoading(false);
    }
  }, []);

  // Defer so the async loader's setState calls happen in the microtask queue,
  // not synchronously in the effect body (lint-clean and DRY).
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return load();
      return undefined;
    });
    return () => {
      active = false;
    };
  }, [load]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    void load();
  };

  const departments = Array.from(new Set(agents.map((a) => a.department)));
  const filtered = agents.filter((a) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.department.toLowerCase().includes(q) ||
      a.objective.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Registry</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every AI agent in the organisation — its objective, scope, tools, permissions and escalation path.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-soft-black text-cream hover:bg-soft-black/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search agents..."
          className="w-full border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-soft-black"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">Loading registry...</div>
      ) : (
        <>
          {/* Department filter chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 self-center">Departments:</span>
            {departments.map((d) => (
              <span key={d} className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gold/10 text-gold border border-gold/20 capitalize">
                {d}
              </span>
            ))}
            <span className="ml-auto self-center text-[10px] text-gray-400">{filtered.length} agents</span>
          </div>

          {/* Agent cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((a) => (
              <div key={a.name} className="bg-white border border-gray-100 flex flex-col">
                <div className="p-4 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-soft-black text-cream flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{a.name}</h3>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{a.department}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-300 ml-auto" />
                  </div>
                  <p className="text-xs text-gray-600 mt-3 leading-relaxed">{a.objective}</p>
                </div>

                <div className="p-4 space-y-3 flex-1">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Scope</p>
                    <p className="text-xs text-gray-600">{a.scope}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Tools</p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.tools.map((t) => (
                        <span key={t} className="inline-flex items-center px-2 py-0.5 text-[10px] bg-gray-50 border border-gray-100 text-gray-600">
                          {TOOL_LABEL[t] || t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Minimum permission
                    </p>
                    <p className="text-xs text-gray-600">{a.permissions}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Escalation</p>
                    <p className="text-xs text-gray-600">{a.escalation}</p>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-50">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Success metrics</p>
                  <ul className="space-y-0.5">
                    {a.successMetrics.map((m, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                        <span className="text-gold mt-0.5">•</span> {m}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full p-8 text-center text-sm text-gray-400">
                No agents found matching &quot;{query}&quot;.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
