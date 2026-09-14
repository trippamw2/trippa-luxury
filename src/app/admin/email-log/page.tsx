"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Mail, CheckCircle, XCircle } from "lucide-react";

type EmailLogEntry = {
  id: string;
  createdAt: string;
  status: "sent" | "failed";
  provider: string;
  toEmail: string;
  toName: string | null;
  subject: string;
  messageId: string | null;
  error: string | null;
};

export default function EmailLogPage() {
  const [entries, setEntries] = useState<EmailLogEntry[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 50;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        params.set("limit", String(perPage));
        params.set("offset", String(page * perPage));

        const res = await fetch(`/api/admin/email-log?${params}`);
        const json = await res.json();
        if (json.error && res.status >= 400) {
          throw new Error(json.error);
        }
        if (cancelled) return;
        setEntries(json.data || []);
        setCount(json.count || 0);
        if (json.error) {
          // migration not applied yet — surface it, keep page usable
          setError(json.error);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to fetch email log");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, page]);

  const totalPages = Math.max(1, Math.ceil(count / perPage));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-soft-black">Email Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every transactional send attempt via Brevo — delivered or failed.
          </p>
        </div>
        <button
          onClick={() => setPage(0)}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-soft-black hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-soft-black"
        >
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>

        <span className="text-sm text-gray-400 self-center ml-auto">
          {count} total sends
        </span>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500 py-10 text-center">Loading email log...</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-gray-500 py-10 text-center flex flex-col items-center gap-2">
          <Mail className="w-6 h-6 text-gray-300" />
          {count === 0 ? "No sends recorded yet. Submit an inquiry or run an email test." : "No entries match the filter."}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Message ID</th>
                <th className="px-4 py-3">Error</th>
                <th className="px-4 py-3">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    {entry.status === "sent" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle className="w-4 h-4" /> Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <XCircle className="w-4 h-4" /> Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-soft-black">{entry.toEmail}</div>
                    {entry.toName && <div className="text-xs text-gray-400">{entry.toName}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={entry.subject}>
                    {entry.subject}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate" title={entry.messageId || ""}>
                    {entry.messageId || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-500 max-w-[220px] truncate" title={entry.error || ""}>
                    {entry.error || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
        >
          Previous
        </button>
        <span>
          Page {page + 1} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
          disabled={page + 1 >= totalPages}
          className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}