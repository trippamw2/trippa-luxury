"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  MapPin,
  Target,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

// ─── Type mirrors for the Market Intelligence API (§5A) ────────────────────

interface MarketSignal {
  destination: string;
  inquiries: number;
  bookings: number;
  conversionRate: number;
  avgBudget: number | null;
  avgBookingValue: number | null;
}

interface Opportunity {
  destination: string;
  signal: "high-demand" | "rising" | "underserved" | "premium-gap";
  conviction: number;
  rationale: string;
}

interface MarketReport {
  generatedAt: string;
  signals: MarketSignal[];
  topDestinations: MarketSignal[];
  opportunities: Opportunity[];
  narrative?: string;
}

interface ScenarioPlan {
  scenario: string;
  label: string;
  description: string;
  recommendations: string[];
  confidence: number;
}

const SIGNAL_META: Record<Opportunity["signal"], { label: string; color: string }> = {
  "high-demand": { label: "High Demand", color: "bg-emerald-50 text-emerald-700" },
  rising: { label: "Rising", color: "bg-indigo-50 text-indigo-700" },
  underserved: { label: "Underserved", color: "bg-amber-50 text-amber-700" },
  "premium-gap": { label: "Premium Gap", color: "bg-purple-50 text-purple-700" },
};

const SCENARIOS = [
  { key: "peak", label: "Peak-Season Capacity" },
  { key: "new_destination", label: "New Destination" },
  { key: "downtime", label: "Off-Season Revenue" },
];

function fmtMoney(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `$${v.toLocaleString()}`;
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function MarketIntelligencePage() {
  const [report, setReport] = useState<MarketReport | null>(null);
  const [scenario, setScenario] = useState<ScenarioPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (target: "market" | "peak" | "new_destination" | "downtime" = "market") => {
    try {
      if (target === "market") {
        const res = await fetch("/api/admin/intelligence");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setReport(json.report);
        setScenario(null);
      } else {
        const res = await fetch(`/api/admin/intelligence?scenario=${target}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setScenario(json.plan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load market intelligence");
    } finally {
      setLoading(false);
    }
  }, []);

  // Defer so the async loader's setState calls happen in the microtask queue,
  // not synchronously in the effect body (lint-clean and DRY).
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return load("market");
      return undefined;
    });
    return () => {
      active = false;
    };
  }, [load]);

  const go = (target: "market" | "peak" | "new_destination" | "downtime" = "market") => {
    setLoading(true);
    setError(null);
    void load(target);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Intelligence</h1>
          <p className="text-sm text-gray-500 mt-1">
            Demand signals, conversion, budgets and opportunities distilled from live inquiries and bookings.
          </p>
        </div>
        <button
          onClick={() => go()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-soft-black text-cream hover:bg-soft-black/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
      )}

      {/* Scenario tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-100">
        <button
          onClick={() => go()}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            !scenario ? "border-soft-black text-soft-black" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Live Market
        </button>
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            onClick={() => go(s.key as "peak" | "new_destination" | "downtime")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              scenario?.scenario === s.key ? "border-soft-black text-soft-black" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">Analyzing the market...</div>
      ) : scenario ? (
        <ScenarioView plan={scenario} />
      ) : report ? (
        <MarketView report={report} />
      ) : (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">No data available.</div>
      )}
    </div>
  );
}

function MarketView({ report }: { report: MarketReport }) {
  return (
    <div className="space-y-6">
      {report.narrative && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-soft-black text-cream p-6"
        >
          <p className="text-xs text-cream/60 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Strategy Narrative
          </p>
          <p className="text-sm text-cream/90 leading-relaxed">{report.narrative}</p>
        </motion.div>
      )}

      {/* Top destinations */}
      <div>
        <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Top Destinations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {report.topDestinations.map((d) => (
            <div key={d.destination} className="bg-white border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 text-gray-900 font-medium">
                <MapPin className="w-3.5 h-3.5 text-gold" />
                <span className="text-sm">{d.destination}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-soft-black">{d.inquiries}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Inquiries</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-soft-black">{d.bookings}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Bookings</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                <p className="text-xs text-gray-500">
                  Conversion: <span className="font-medium text-gray-900">{Math.round(d.conversionRate * 100)}%</span>
                </p>
                <p className="text-xs text-gray-500">
                  Avg budget: <span className="font-medium text-gray-900">{fmtMoney(d.avgBudget)}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Avg value: <span className="font-medium text-gray-900">{fmtMoney(d.avgBookingValue)}</span>
                </p>
              </div>
            </div>
          ))}
          {report.topDestinations.length === 0 && (
            <div className="col-span-full p-6 text-center text-sm text-gray-400">
              No destination data yet — inquiries will populate this view.
            </div>
          )}
        </div>
      </div>

      {/* Opportunities */}
      <div>
        <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-gold" /> Opportunities
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {report.opportunities.map((o, i) => {
            const meta = SIGNAL_META[o.signal];
            return (
              <div key={`${o.destination}-${i}`} className="bg-white border border-gray-100 p-4">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{o.destination}</span>
                  <span className="ml-auto text-[10px] text-gray-400">Conviction {Math.round(o.conviction * 100)}%</span>
                </div>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{o.rationale}</p>
              </div>
            );
          })}
          {report.opportunities.length === 0 && (
            <div className="col-span-full p-6 text-center text-sm text-gray-400">
              No opportunities detected yet.
            </div>
          )}
        </div>
      </div>

      {/* Full signal table */}
      {report.signals.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">All Signals</h2>
          <div className="bg-white border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-left text-[10px] uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3 text-right">Inquiries</th>
                  <th className="px-4 py-3 text-right">Bookings</th>
                  <th className="px-4 py-3 text-right">Conversion</th>
                  <th className="px-4 py-3 text-right">Avg Budget</th>
                  <th className="px-4 py-3 text-right">Avg Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.signals.map((s) => (
                  <tr key={s.destination}>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.destination}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{s.inquiries}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{s.bookings}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{Math.round(s.conversionRate * 100)}%</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtMoney(s.avgBudget)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmtMoney(s.avgBookingValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioView({ plan }: { plan: ScenarioPlan }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
      <div className="bg-white border border-gray-100 p-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold" />
          <h2 className="text-lg font-semibold text-gray-900">{plan.label}</h2>
          <span className="ml-auto inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700">
            {Math.round(plan.confidence * 100)}% confidence
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
        <div className="mt-4 pt-4 border-t border-gray-50">
          <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Recommended actions</p>
          <ul className="space-y-2">
            {plan.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <ArrowRight className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 p-4 bg-amber-50 border border-amber-100 text-sm text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        Scenario plans are directional guidance — review against live supplier availability before committing.
      </div>
    </motion.div>
  );
}
