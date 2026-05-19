"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { workflowEngine } from "@/lib/ai/workflow-engine";
import type { ClientJourney, ConciergeState } from "@/lib/ai/workflow-engine";
import {
  Search, Plus, X, CheckCircle, AlertCircle, Send, CreditCard,
  FileText, MessageSquare, UserCheck, Archive, ArrowRight, Loader2,
  Mail, Phone, MapPin, Calendar, DollarSign, ChevronDown, MoreHorizontal
} from "lucide-react";

// ─── Pipeline Columns ──────────────────────────────────────────────────

const PIPELINE_COLUMNS: { state: ConciergeState; label: string }[] = [
  { state: "new", label: "New Enquiries" },
  { state: "qualifying", label: "Qualifying" },
  { state: "curating", label: "Curating" },
  { state: "quoted", label: "Quote Sent" },
  { state: "reviewing", label: "Reviewing" },
  { state: "provisional", label: "Provisional" },
  { state: "deposit-paid", label: "Deposit Paid" },
  { state: "confirmed", label: "Confirmed" },
  { state: "itinerary-sent", label: "Itinerary Sent" },
  { state: "in-progress", label: "In Residence" },
  { state: "completed", label: "Completed" },
  { state: "follow-up", label: "Follow-up" },
];

// ─── Journey Card ───────────────────────────────────────────────────────

function JourneyCard({
  journey,
  onTransition,
  onDelete,
}: {
  journey: ClientJourney;
  onTransition: (id: string, action: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const actions = workflowEngine.getAvailableActions(journey.state);
  const nextAgent = workflowEngine.getNextAgent(journey.state);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-sand-light p-3 mb-2 group"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-soft-black leading-tight">{journey.clientName}</h4>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-sand-light rounded transition-all">
            <MoreHorizontal className="w-3.5 h-3.5 text-earth" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white border border-sand-light shadow-lg z-20 min-w-[160px] py-1">
                {actions.map((a) => (
                  <button
                    key={a.to}
                    onClick={() => { onTransition(journey.id, a.to); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-soft-black hover:bg-warm-white"
                  >
                    Move to {workflowEngine.getStateLabel(a.to)}
                  </button>
                ))}
                <div className="border-t border-sand-light mt-1 pt-1">
                  <button
                    onClick={() => { onDelete(journey.id); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {journey.destination && (
        <p className="text-xs text-earth flex items-center gap-1 mb-1">
          <MapPin className="w-3 h-3" />{journey.destination}
        </p>
      )}

      <div className="flex items-center gap-2 text-[10px] text-earth mb-2">
        {journey.preferredDates && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{journey.preferredDates}</span>}
        {journey.guests && <span>{journey.guests} guests</span>}
      </div>

      {journey.quoteAmount && (
        <p className="text-xs font-semibold text-gold mb-2">
          {journey.currency || "USD"} ${journey.quoteAmount.toLocaleString()}
        </p>
      )}

      {nextAgent && (
        <p className="text-[10px] text-earth italic border-t border-sand-light pt-2 mt-1">
          Next: {nextAgent.description}
        </p>
      )}
    </motion.div>
  );
}

// ─── Main Pipeline Page ─────────────────────────────────────────────────

export default function AdminPipeline() {
  const [journeys, setJourneys] = useState<ClientJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchJourneys = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ai/workflow");
      const json = await res.json();
      setJourneys(json.data || []);
    } catch (err) {
      showToast("Failed to load journeys", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJourneys();
  }, []);

  const handleTransition = async (journeyId: string, targetState: string) => {
    try {
      const res = await fetch("/api/ai/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: targetState,
          journeyId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || "Transition failed", "error");
        return;
      }

      await fetchJourneys();
      showToast(`Journey moved`, "success");
    } catch (err) {
      showToast("Failed to transition journey", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/workflow?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchJourneys();
      showToast("Journey deleted", "success");
    } catch (err) {
      showToast("Failed to delete journey", "error");
    }
  };

  const handleAddJourney = async () => {
    try {
      const res = await fetch("/api/ai/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enquiry_received",
          clientName: formData.clientName,
          email: formData.email,
          phone: formData.phone || "",
          destination: formData.destination || "",
          preferredDates: formData.preferredDates || "",
          guests: formData.guests ? Number(formData.guests) : undefined,
        }),
      });

      if (!res.ok) throw new Error("Create failed");

      await fetchJourneys();
      setShowAddModal(false);
      setFormData({});
      showToast("Journey created", "success");
    } catch (err) {
      showToast("Failed to create journey", "error");
    }
  };

  const getColumnJourneys = (state: ConciergeState) => {
    let filtered = journeys.filter((j) => j.state === state);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (j) =>
          j.clientName.toLowerCase().includes(q) ||
          j.email.toLowerCase().includes(q) ||
          j.destination?.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-soft-black">Pipeline</h1>
          <p className="text-earth mt-1 text-sm">Manage the full client journey — from enquiry to post-trip follow-up</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
            <input
              type="text" placeholder="Search pipeline..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white"
            />
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gold text-soft-black font-medium text-sm hover:bg-gold/90">
            <Plus className="w-4 h-4" />Add Client
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {PIPELINE_COLUMNS.map((col) => {
          const count = getColumnJourneys(col.state).length;
          return (
            <button
              key={col.state}
              onClick={() => setExpandedColumn(expandedColumn === col.state ? null : col.state)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs border transition-all whitespace-nowrap ${
                count > 0
                  ? "border-gold bg-gold/5 text-soft-black"
                  : "border-sand-light text-earth"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${workflowEngine.getStateColor(col.state)}`} />
              {col.label}
              <span className="font-semibold ml-1">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Pipeline Columns */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-earth animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-8" style={{ minHeight: "60vh" }}>
          {PIPELINE_COLUMNS.map((col) => {
            const colJourneys = getColumnJourneys(col.state);
            const isExpanded = expandedColumn === col.state;
            const isCollapsed = expandedColumn !== null && !isExpanded;

            if (isCollapsed && colJourneys.length === 0) return null;

            return (
              <div
                key={col.state}
                className={`flex-shrink-0 transition-all duration-200 ${
                  isExpanded ? "w-[320px]" : isCollapsed ? "w-0 overflow-hidden" : "w-[240px]"
                }`}
              >
                <div className="bg-sand-light/30 border border-sand-light">
                  {/* Column Header */}
                  <div className={`p-3 ${workflowEngine.getStateColor(col.state)} bg-opacity-10`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${workflowEngine.getStateColor(col.state)}`} />
                        <h3 className="text-xs font-semibold text-soft-black uppercase tracking-wider">
                          {col.label}
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-earth bg-white/60 px-2 py-0.5">
                        {colJourneys.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Cards */}
                  <div className="p-2 space-y-1 min-h-[120px]">
                    {colJourneys.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-[11px] text-earth">No journeys</p>
                      </div>
                    ) : (
                      colJourneys.map((journey) => (
                        <JourneyCard
                          key={journey.id}
                          journey={journey}
                          onTransition={handleTransition}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Client Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              className="bg-cream border border-sand-light p-6 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-soft-black">Add Client to Pipeline</h2>
                <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-earth" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-earth uppercase mb-2">Client Name</label>
                  <input type="text" value={formData.clientName || ""} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-sand-light text-sm bg-white" placeholder="e.g. Sarah & James Mitchell" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">Email</label>
                    <input type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-sand-light text-sm bg-white" placeholder="client@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">Phone</label>
                    <input type="tel" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-sand-light text-sm bg-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-earth uppercase mb-2">Destination</label>
                  <input type="text" value={formData.destination || ""} onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-4 py-2.5 border border-sand-light text-sm bg-white" placeholder="e.g. Zanzibar" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">Preferred Dates</label>
                    <input type="text" value={formData.preferredDates || ""} onChange={(e) => setFormData({ ...formData, preferredDates: e.target.value })}
                      className="w-full px-4 py-2.5 border border-sand-light text-sm bg-white" placeholder="e.g. Aug 2026" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-earth uppercase mb-2">Guests</label>
                    <input type="number" value={formData.guests || ""} onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                      className="w-full px-4 py-2.5 border border-sand-light text-sm bg-white" placeholder="2" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-sand-light">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm">Cancel</button>
                <button onClick={handleAddJourney}
                  disabled={!formData.clientName || !formData.email}
                  className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium disabled:opacity-50">
                  Add to Pipeline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
