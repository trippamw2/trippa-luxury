"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Users,
  MapPin,
  BookHeart,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

// ─── Type mirror for the Platform Intelligence API (§3/4) ────────────────

interface PlatformHealth {
  generatedAt: string;
  pipeline: {
    inquiries: number;
    bookings: number;
    conversionRate: number;
    pipelineValue: number;
  };
  supply: {
    suppliers: number;
    activeSuppliers: number;
    avgRating: number;
  };
  engagement: {
    savedJourneys: number;
    interactions: number;
  };
  finance: {
    totalRevenue: number;
    outstandingBalance: number;
  };
  score: number;
  flags: string[];
}

function scoreTone(score: number) {
  if (score >= 70) return { text: "text-emerald-600", ring: "border-emerald-200", label: "Healthy" };
  if (score >= 45) return { text: "text-amber-600", ring: "border-amber-200", label: "Developing" };
  return { text: "text-red-600", ring: "border-red-200", label: "Attention" };
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function PlatformHealthPage() {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/platform-intelligence");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setHealth(json.health);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load platform health");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">
        Reconciling the organisation...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
    );
  }

  if (!health) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">No data available.</div>
    );
  }

  const tone = scoreTone(health.score);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Health</h1>
          <p className="text-sm text-gray-500 mt-1">
            The operating report that ties every AI agent&apos;s contribution into one score.
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-soft-black text-cream hover:bg-soft-black/90 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Score + flags */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`lg:col-span-1 bg-white border ${tone.ring} p-6 flex flex-col items-center justify-center`}
        >
          <div className={`text-5xl font-bold ${tone.text}`}>{health.score}</div>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest mt-1">Platform score / 100</p>
          <span className={`mt-3 inline-flex items-center px-2.5 py-1 text-xs font-medium ${tone.text} border ${tone.ring}`}>
            <Activity className="w-3.5 h-3.5 mr-1.5" /> {tone.label}
          </span>
          <p className="text-[10px] text-gray-400 mt-3">{new Date(health.generatedAt).toLocaleString()}</p>
        </motion.div>

        <div className="lg:col-span-2 space-y-4">
          {health.flags.length === 0 ? (
            <div className="bg-white border border-gray-100 p-5 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-sm text-gray-700">No flags — the organisation is running clean.</p>
            </div>
          ) : (
            health.flags.map((f, i) => (
              <div key={i} className="bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">{f}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* KPI groups */}
      <KpiGroup title="Pipeline" icon={<Users className="w-4 h-4 text-gold" />}>
        <Kpi label="Inquiries" value={health.pipeline.inquiries} />
        <Kpi label="Bookings" value={health.pipeline.bookings} />
        <Kpi label="Conversion" value={`${Math.round(health.pipeline.conversionRate * 100)}%`} />
        <Kpi label="Pipeline value" value={`$${health.pipeline.pipelineValue.toLocaleString()}`} />
      </KpiGroup>

      <KpiGroup title="Supply" icon={<MapPin className="w-4 h-4 text-gold" />}>
        <Kpi label="Total suppliers" value={health.supply.suppliers} />
        <Kpi label="Active" value={health.supply.activeSuppliers} />
        <Kpi label="Avg rating" value={health.supply.avgRating || "—"} />
      </KpiGroup>

      <KpiGroup title="Engagement" icon={<BookHeart className="w-4 h-4 text-gold" />}>
        <Kpi label="Saved journeys" value={health.engagement.savedJourneys} />
        <Kpi label="Interactions" value={health.engagement.interactions} />
      </KpiGroup>

      <KpiGroup title="Finance" icon={<DollarSign className="w-4 h-4 text-gold" />}>
        <Kpi label="Total revenue" value={`$${health.finance.totalRevenue.toLocaleString()}`} />
        <Kpi label="Outstanding" value={`$${health.finance.outstandingBalance.toLocaleString()}`} />
      </KpiGroup>
    </div>
  );
}

function KpiGroup({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{children}</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xl font-bold text-soft-black">{value}</p>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
