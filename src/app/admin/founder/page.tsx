"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Target,
  Users,
  Flame,
  Scale,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  UserCheck,
  ArrowRightLeft,
} from "lucide-react";

// ─── Type mirrors for the Chief of Staff API responses ─────────────────────

interface BriefingItem {
  id: string;
  type: "priority" | "customer" | "lead" | "decision" | "bottleneck" | "risk" | "opportunity";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  relatedId?: string;
  relatedType?: string;
  action?: "founder" | "delegate" | "monitor" | "approve";
  dueAt?: string;
}

interface DailyBriefing {
  generatedAt: string;
  summary: string;
  items: BriefingItem[];
  today: {
    topPriorities: BriefingItem[];
    importantCustomers: BriefingItem[];
    highValueLeads: BriefingItem[];
    pendingDecisions: BriefingItem[];
    bottlenecks: BriefingItem[];
    risks: BriefingItem[];
    opportunities: BriefingItem[];
  };
  founder: {
    shouldDo: string[];
    shouldDelegate: string[];
    highestLeverageAction: string;
  };
}

interface WeeklyReviewSection {
  heading: string;
  points: string[];
}

interface WeeklyReview {
  generatedAt: string;
  weekLabel: string;
  sections: WeeklyReviewSection[];
  highestLeverageAction: string;
  metrics: {
    newInquiries: number;
    convertedInquiries: number;
    newBookings: number;
    revenue: number;
    openTasks: number;
    completedTasks: number;
    atRiskCustomers: number;
  };
}

// ─── Presentation helpers ────────────────────────────────────────────────

const TYPE_META: Record<BriefingItem["type"], { label: string; icon: typeof Target; color: string }> = {
  priority: { label: "Priority", icon: Target, color: "text-amber-600 bg-amber-50" },
  customer: { label: "Customer", icon: Users, color: "text-indigo-600 bg-indigo-50" },
  lead: { label: "Hot Lead", icon: Flame, color: "text-red-600 bg-red-50" },
  decision: { label: "Decision", icon: Scale, color: "text-purple-600 bg-purple-50" },
  bottleneck: { label: "Bottleneck", icon: AlertTriangle, color: "text-orange-600 bg-orange-50" },
  risk: { label: "Risk", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  opportunity: { label: "Opportunity", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
};

const ACTION_LABEL: Record<string, string> = {
  founder: "Founder",
  delegate: "Delegate",
  monitor: "Monitor",
  approve: "Approve",
};

function severityBadge(severity: string) {
  if (severity === "high") return "bg-red-50 text-red-700";
  if (severity === "medium") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

function ItemRow({ item }: { item: BriefingItem }) {
  const meta = TYPE_META[item.type] || TYPE_META.priority;
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors rounded">
      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${meta.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900">{item.title}</p>
          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium ${severityBadge(item.severity)}`}>
            {item.severity}
          </span>
          {item.action && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600">
              {item.action === "delegate" ? <UserCheck className="w-3 h-3" /> : item.action === "approve" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {ACTION_LABEL[item.action]}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
        {item.dueAt && (
          <p className="text-[10px] text-gray-400 mt-1">Due: {new Date(item.dueAt).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

function ListSection({ title, icon: Icon, items, empty }: {
  title: string;
  icon: typeof Target;
  items: BriefingItem[];
  empty: string;
}) {
  return (
    <div className="bg-white border border-gray-100">
      <div className="p-4 border-b border-gray-50 flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">{title}</h2>
        <span className="ml-auto text-[10px] text-gray-400">{items.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">{empty}</div>
        ) : (
          items.map((item) => <ItemRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function FounderDashboard() {
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDaily = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/chief-of-staff/daily-briefing");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setBriefing(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load daily briefing");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadWeekly = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/chief-of-staff/weekly-review");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setReview(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weekly review");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDaily();
  }, []);

  useEffect(() => {
    if (tab === "weekly" && !review) loadWeekly();
  }, [tab, review]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (tab === "daily") loadDaily(true);
    else loadWeekly(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Chief of Staff</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your executive briefing — what to focus on, what to delegate, and where the business is heading.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-soft-black text-cream hover:bg-soft-black/90 transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {refreshing ? "Refreshing..." : "Regenerate"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-100">
        {[
          { key: "daily" as const, label: "Daily Briefing" },
          { key: "weekly" as const, label: "Weekly CEO Review" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-soft-black text-soft-black"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-sm text-gray-400">Consulting your Chief of Staff...</div>
        </div>
      ) : tab === "daily" && briefing ? (
        <div className="space-y-6">
          {/* Summary + founder routing */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-soft-black text-cream p-6"
          >
            <p className="text-xs text-cream/60 uppercase tracking-widest mb-1">
              {briefing.generatedAt ? new Date(briefing.generatedAt).toLocaleString() : ""}
            </p>
            <p className="text-lg font-medium text-cream leading-relaxed">{briefing.summary}</p>
            <div className="mt-5 pt-5 border-t border-white/10">
              <p className="text-xs text-cream/60 uppercase tracking-widest mb-2">Highest-Leverage Action</p>
              <p className="text-sm text-amber-300 font-medium flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {briefing.founder.highestLeverageAction}
              </p>
            </div>
          </motion.div>

          {/* Founder routing */}
          {briefing.items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-100 p-5">
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-purple-600" /> For the Founder
                </h3>
                {briefing.founder.shouldDo.length === 0 ? (
                  <p className="text-sm text-gray-400">Nothing requires your direct input today.</p>
                ) : (
                  <ul className="space-y-2">
                    {briefing.founder.shouldDo.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <ArrowRightLeft className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-white border border-gray-100 p-5">
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" /> Delegate to the Team
                </h3>
                {briefing.founder.shouldDelegate.length === 0 ? (
                  <p className="text-sm text-gray-400">Nothing to delegate today.</p>
                ) : (
                  <ul className="space-y-2">
                    {briefing.founder.shouldDelegate.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <UserCheck className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ListSection title="Top Priorities" icon={Target} items={briefing.today.topPriorities} empty="No priorities to action today." />
            <ListSection title="High-Value Leads" icon={Flame} items={briefing.today.highValueLeads} empty="No hot leads right now." />
            <ListSection title="Bottlenecks" icon={AlertTriangle} items={briefing.today.bottlenecks} empty="No bottlenecks detected." />
            <ListSection title="Pending Decisions" icon={Scale} items={briefing.today.pendingDecisions} empty="No pending decisions." />
            <ListSection title="Risks" icon={AlertTriangle} items={briefing.today.risks} empty="No risks currently flagged." />
            <ListSection title="Opportunities" icon={TrendingUp} items={briefing.today.opportunities} empty="No opportunities detected." />
          </div>

          {briefing.today.importantCustomers.length > 0 && (
            <ListSection title="Important Customers" icon={Users} items={briefing.today.importantCustomers} empty="" />
          )}
        </div>
      ) : tab === "weekly" && review ? (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-soft-black text-cream p-6"
          >
            <p className="text-xs text-cream/60 uppercase tracking-widest mb-1">Weekly CEO Review</p>
            <p className="text-sm text-cream/70">{review.weekLabel}</p>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mt-6">
              {[
                { label: "New Inquiries", value: review.metrics.newInquiries },
                { label: "Converted", value: review.metrics.convertedInquiries },
                { label: "New Bookings", value: review.metrics.newBookings },
                { label: "Revenue", value: `$${review.metrics.revenue.toLocaleString()}` },
                { label: "Open Tasks", value: review.metrics.openTasks },
                { label: "Done Tasks", value: review.metrics.completedTasks },
                { label: "At Risk", value: review.metrics.atRiskCustomers },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <p className="text-xl font-bold text-amber-300">{m.value}</p>
                  <p className="text-[10px] text-cream/60 uppercase tracking-wider mt-1">{m.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-white/10">
              <p className="text-xs text-cream/60 uppercase tracking-widest mb-2">Highest-Leverage Next Step</p>
              <p className="text-sm text-amber-300 font-medium">{review.highestLeverageAction}</p>
            </div>
          </motion.div>

          {review.sections.map((section) => (
            <div key={section.heading} className="bg-white border border-gray-100">
              <div className="p-4 border-b border-gray-50">
                <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">{section.heading}</h2>
              </div>
              <ul className="p-4 space-y-2">
                {section.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">
          No data available.
        </div>
      )}
    </div>
  );
}
