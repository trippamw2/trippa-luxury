"use client";

// ─── Mission Control ────────────────────────────────────────────────────────
// One screen for everything the AI organisation has escalated to a human:
// autonomy-policy decisions, KORA findings awaiting approval, and
// HUMAN_REVIEW_REQUESTED escalations. Ordered most-exposed first, because the
// operator's scarce resource is attention, not items.
//
// Only `decision` rows can be actioned here. Gaps are resolved by whoever owns
// the remediation, and escalation events are a record of the ask, not the ask
// itself — showing action buttons for them would invite the operator to
// believe a click did something.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

type ReviewSource = "decision" | "gap" | "event";

type ReviewItem = {
  id: string;
  source: ReviewSource;
  title: string;
  summary: string | null;
  recommendation: string | null;
  status: string;
  riskLevel: string | null;
  agentName: string | null;
  autonomyLevel: number | null;
  evidenceCount: number | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

type Counts = { total: number; decision: number; gap: number; event: number };

const SOURCE_LABELS: Record<ReviewSource, string> = {
  decision: "Decision",
  gap: "Gap",
  event: "Escalation",
};

const RISK_STYLES: Record<string, string> = {
  critical: "text-red-700 bg-red-50 border-red-200",
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-gray-600 bg-gray-50 border-gray-200",
};

const STATUS_STYLES: Record<string, string> = {
  proposed: "text-amber-600 bg-amber-50 border-amber-200",
  rejected: "text-red-600 bg-red-50 border-red-200",
  approved: "text-emerald-600 bg-emerald-50 border-emerald-200",
  overridden: "text-purple-600 bg-purple-50 border-purple-200",
  open: "text-amber-600 bg-amber-50 border-amber-200",
  escalated: "text-amber-600 bg-amber-50 border-amber-200",
};

export default function MissionControlPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"" | ReviewSource>("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Bumping this is how Retry refetches. The fetch lives inside the effect
  // rather than in a useCallback so every setState runs after an `await`,
  // keeping it off the synchronous-effect path that triggers cascading renders
  // (react-hooks/set-state-in-effect).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/mission-control");
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to load the review queue");
        }
        const json = await res.json();
        if (cancelled) return;
        setItems(json.items || []);
        setCounts(json.counts || null);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load the review queue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function decide(item: ReviewItem, outcome: "approved" | "rejected" | "overridden") {
    setBusyId(item.id);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/mission-control", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, outcome, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record the outcome");
      // Drop it from the queue rather than refetching: a closed decision is
      // no longer pending, and reloading the whole queue for one row would
      // discard the operator's filter and expanded state.
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setNote("");
      setExpanded(null);
      if (counts) {
        setCounts({ ...counts, total: counts.total - 1, decision: counts.decision - 1 });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to record the outcome");
    } finally {
      setBusyId(null);
    }
  }

  const visible = sourceFilter ? items.filter((i) => i.source === sourceFilter) : items;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-soft-black">Mission Control</h1>
          <p className="text-sm text-gray-500 mt-1">
            Everything the AI organisation has escalated for a human decision
          </p>
        </div>
      </div>

      {/* Queue summary */}
      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {(
            [
              { label: "Awaiting you", value: counts.total, filter: "" as const },
              { label: "Decisions", value: counts.decision, filter: "decision" as const },
              { label: "Gaps", value: counts.gap, filter: "gap" as const },
              { label: "Escalations", value: counts.event, filter: "event" as const },
            ]
          ).map((card) => (
            <button
              key={card.label}
              onClick={() => setSourceFilter(card.filter)}
              className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                sourceFilter === card.filter
                  ? "border-earth bg-earth/5"
                  : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <div className="text-xs text-gray-500 uppercase tracking-wider">{card.label}</div>
              <div className="text-2xl font-serif font-bold text-soft-black mt-1">
                {card.value}
              </div>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-3">
          <span>{error}</span>
          <button
            onClick={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
            className="ml-auto px-3 py-1 text-xs rounded border border-red-200 bg-white text-red-700 hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {actionError}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-gray-400">Loading the review queue...</div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          {items.length === 0
            ? "Nothing is waiting on a human. The AI organisation is clear."
            : "No items in this category."}
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {visible.map((item) => {
              const isOpen = expanded === item.id;
              const busy = busyId === item.id;
              const actionable = item.source === "decision";

              return (
                <div key={`${item.source}:${item.id}`}>
                  <div className="flex items-start gap-4 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-600 bg-gray-50">
                          {SOURCE_LABELS[item.source]}
                        </span>
                        {item.riskLevel && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded border font-medium ${
                              RISK_STYLES[item.riskLevel] || RISK_STYLES.low
                            }`}
                          >
                            {item.riskLevel}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${
                            STATUS_STYLES[item.status] || STATUS_STYLES.escalated
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-sm text-soft-black font-medium truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {[
                          item.agentName ? `by ${item.agentName}` : null,
                          item.autonomyLevel !== null ? `level ${item.autonomyLevel}` : null,
                          item.evidenceCount !== null
                            ? `${item.evidenceCount} evidence item${item.evidenceCount === 1 ? "" : "s"}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setExpanded(isOpen ? null : item.id);
                        setNote("");
                      }}
                      className="text-xs text-earth hover:text-earth-dark transition-colors shrink-0"
                    >
                      {isOpen ? "Hide" : "Review"}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 bg-gray-50/30 border-t border-gray-50">
                      {item.summary && (
                        <div className="mb-3">
                          <h4 className="font-medium text-gray-500 mb-1 uppercase tracking-wider text-[10px]">
                            Rationale
                          </h4>
                          <p className="text-sm text-gray-700">{item.summary}</p>
                        </div>
                      )}
                      {item.recommendation && (
                        <div className="mb-3">
                          <h4 className="font-medium text-gray-500 mb-1 uppercase tracking-wider text-[10px]">
                            Recommendation
                          </h4>
                          <p className="text-sm text-gray-700">{item.recommendation}</p>
                        </div>
                      )}
                      {item.entityId && (
                        <p className="text-xs text-gray-400 mb-3">
                          {item.entityType ?? "record"}{" "}
                          <code className="font-mono">{item.entityId.slice(0, 8)}…</code>
                        </p>
                      )}

                      {actionable ? (
                        <>
                          <label className="block text-xs text-gray-500 mb-1" htmlFor={`note-${item.id}`}>
                            Note (recorded on the decision)
                          </label>
                          <input
                            id={`note-${item.id}`}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Optional — why you reached this call"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-soft-black mb-3"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => decide(item, "approved")}
                              disabled={busy}
                              className="px-3 py-1.5 text-xs rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => decide(item, "rejected")}
                              disabled={busy}
                              className="px-3 py-1.5 text-xs rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => decide(item, "overridden")}
                              disabled={busy}
                              title="Accept the item but record that you overrode the machine's conclusion"
                              className="px-3 py-1.5 text-xs rounded border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Override
                            </button>
                            {busy && <span className="text-xs text-gray-400 self-center">Recording…</span>}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">
                          {item.source === "gap"
                            ? "KORA findings are resolved by the owner of the remediation, not here."
                            : "Escalation events are a record of the request, not the request itself."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
