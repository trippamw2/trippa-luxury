"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  Inbox,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";

/**
 * Staged Reminder Review
 *
 * The human half of the reminder flow. `POST /api/ai/trigger-reminders` renders
 * due reminders into `staged_reminders` and contacts nobody; this page is where a
 * person reads the exact message that would go out and decides.
 *
 * Two rules shape the UI:
 *
 * 1. The preview MUST be the artifact. What is rendered here is the `body_html`
 *    dispatch will send — dispatch never re-derives it. So a reviewer is judging
 *    the real thing, not a summary of it.
 * 2. The preview is isolated. `body_html` interpolates guest-supplied names and
 *    destinations into a template, so it is rendered in a fully sandboxed iframe
 *    with scripts and same-origin access disabled. Injecting it into this page
 *    would let a crafted booking field run script against an admin session.
 */

type StagedReminder = {
  id: string;
  bookingId: string;
  bookingReference: string | null;
  kind: string;
  messageType: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  bodyHtml: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};

type Filter = "pending" | "approved" | "all";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  pending: { label: "Awaiting review", className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", className: "bg-blue-50 text-blue-700 border-blue-200" },
  dispatching: { label: "Sending", className: "bg-blue-50 text-blue-700 border-blue-200" },
  dispatched: { label: "Sent", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", className: "bg-gray-100 text-gray-600 border-gray-200" },
  failed: { label: "Send failed", className: "bg-red-50 text-red-700 border-red-200" },
};

export default function StagedRemindersPage() {
  const [reminders, setReminders] = useState<StagedReminder[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState<Filter>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  // Bumped to re-run the effect's fetch after a review or dispatch, so the list
  // refreshes without the effect having to know about either action.
  const [reloadToken, setReloadToken] = useState(0);

  // The fetch lives inside the effect rather than in a shared callback: a
  // reusable loader called synchronously from the effect body triggers a
  // cascading render on every mount. Event handlers bump `reloadToken` instead.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/staged-reminders?status=${filter}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load staged reminders");
        if (cancelled) return;
        setReminders(json.reminders || []);
        // The pending count is the size of the review queue, so it is shown on
        // every filter: an operator looking at "all" still needs to know work is
        // waiting.
        setPendingCount(json.pendingCount ?? 0);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load staged reminders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [filter, reloadToken]);

  async function review(id: string, outcome: "approved" | "rejected") {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/staged-reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, outcome, note: notes[id]?.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record the decision");
      setNotice(outcome === "approved" ? "Approved. It will go out on the next dispatch." : "Rejected.");
      setSelectedId(null);
      setReloadToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record the decision");
    } finally {
      setBusyId(null);
    }
  }

  async function dispatch(id?: string) {
    setDispatching(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/staged-reminders/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(id ? { body: JSON.stringify({ id }) } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Dispatch failed");

      if (typeof json.dispatched === "number") {
        // A partial batch is reported as a failure by the route, so the counts —
        // not just `success` — are what the operator needs to see.
        const failed = json.failed ?? 0;
        setNotice(
          failed === 0
            ? `Sent ${json.dispatched} reminder${json.dispatched === 1 ? "" : "s"}.`
            : `Sent ${json.dispatched}, ${failed} failed. ${(json.details?.failures ?? [])
                .map((f: { error: string }) => f.error)
                .join("; ")}`
        );
      } else {
        setNotice(json.message || "Nothing to send.");
      }
      setReloadToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dispatch failed");
    } finally {
      setDispatching(false);
    }
  }

  const approvedCount = reminders.filter((r) => r.status === "approved").length;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold text-soft-black">Reminder Review</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Reminders are composed overnight and sent nothing. Nothing reaches a guest until a
            reviewer approves the exact message below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-2 border rounded-lg text-sm ${
              filter === "pending"
                ? "border-soft-black bg-soft-black text-cream"
                : "border-gray-200 bg-white text-soft-black hover:bg-gray-50"
            }`}
          >
            Awaiting review
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-3 py-2 border rounded-lg text-sm ${
              filter === "approved"
                ? "border-soft-black bg-soft-black text-cream"
                : "border-gray-200 bg-white text-soft-black hover:bg-gray-50"
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-2 border rounded-lg text-sm ${
              filter === "all"
                ? "border-soft-black bg-soft-black text-cream"
                : "border-gray-200 bg-white text-soft-black hover:bg-gray-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setReloadToken((t) => t + 1)}
            aria-label="Refresh"
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-soft-black hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg mb-6 text-sm">
          {notice}
        </div>
      )}

      {/* Dispatch is a deliberate act on the whole approved queue, so it is only
          offered when there is something approved and never alongside a silent
          auto-send. */}
      {filter !== "pending" && approvedCount > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-gray-600">
            {approvedCount} approved reminder{approvedCount === 1 ? "" : "s"} ready to send.
          </p>
          <button
            onClick={() => void dispatch()}
            disabled={dispatching}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-soft-black text-cream text-sm disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {dispatching ? "Sending…" : "Send approved"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500 py-10 text-center">Loading reminders…</div>
      ) : reminders.length === 0 ? (
        <div className="text-sm text-gray-500 py-10 text-center flex flex-col items-center gap-2">
          <Inbox className="w-6 h-6 text-gray-300" />
          {filter === "pending"
            ? pendingCount === 0
              ? "Nothing is waiting for review."
              : "No pending reminders."
            : "No reminders match this filter."}
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => {
            const style = STATUS_STYLE[reminder.status] ?? {
              label: reminder.status,
              className: "bg-gray-100 text-gray-600 border-gray-200",
            };
            const isOpen = reminder.status === "pending";
            const isSelected = selectedId === reminder.id;

            return (
              <div key={reminder.id} className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 flex items-start justify-between gap-4 flex-wrap border-b border-gray-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full border text-xs ${style.className}`}>
                        {style.label}
                      </span>
                      <span className="text-xs text-gray-400 uppercase tracking-wider">
                        {reminder.kind === "followup" ? "Follow-up" : "Reminder"} ·{" "}
                        {reminder.messageType}
                      </span>
                      {reminder.bookingReference && (
                        <span className="text-xs text-gray-400">{reminder.bookingReference}</span>
                      )}
                    </div>
                    <div className="text-soft-black font-medium">{reminder.subject}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      To {reminder.recipientName ? `${reminder.recipientName} · ` : ""}
                      {reminder.recipientEmail}
                    </div>
                    {reminder.reviewNote && (
                      <div className="text-xs text-gray-500 mt-1">
                        Note: {reminder.reviewNote}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedId(isSelected ? null : reminder.id)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-soft-black hover:bg-gray-50"
                    >
                      {isSelected ? "Hide preview" : "Preview"}
                    </button>
                  </div>
                </div>

                {isSelected && (
                  <div className="p-4">
                    {/* Sandboxed with no allow-* tokens: scripts, forms, popups and
                        same-origin access are all off, so interpolated guest data
                        cannot reach this admin session. */}
                    <iframe
                      title={`Preview: ${reminder.subject}`}
                      srcDoc={reminder.bodyHtml}
                      sandbox=""
                      className="w-full h-96 border border-gray-200 rounded-lg bg-white"
                    />

                    {isOpen && (
                      <div className="mt-4 flex flex-col gap-3">
                        <label className="text-sm text-gray-600">
                          Note (optional) — kept on the audit trail and the message record.
                          <input
                            type="text"
                            value={notes[reminder.id] ?? ""}
                            onChange={(e) =>
                              setNotes((prev) => ({ ...prev, [reminder.id]: e.target.value }))
                            }
                            placeholder="e.g. changed the lodge name to match the booking"
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-soft-black"
                          />
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void review(reminder.id, "approved")}
                            disabled={busyId === reminder.id}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-soft-black text-cream text-sm disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => void review(reminder.id, "rejected")}
                            disabled={busyId === reminder.id}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white text-soft-black hover:bg-gray-50 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                          <span className="text-xs text-gray-400">
                            Approving does not send. It authorises the next dispatch to send this
                            exact message.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}