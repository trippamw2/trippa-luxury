"use client";

import { useState, useEffect, useCallback } from "react";

type AuditEntry = {
  id: string;
  tableName: string;
  recordId: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  oldData: Record<string, any> | null;
  newData: Record<string, any> | null;
  performedBy: { fullName: string; role: string } | null;
  ipAddress: string | null;
  createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "text-emerald-600 bg-emerald-50 border-emerald-200",
  UPDATE: "text-amber-600 bg-amber-50 border-amber-200",
  DELETE: "text-red-600 bg-red-50 border-red-200",
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const perPage = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tableFilter) params.set("table", tableFilter);
      if (actionFilter) params.set("action", actionFilter);
      params.set("limit", String(perPage));
      params.set("offset", String(page * perPage));

      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to fetch audit log");
      }
      const json = await res.json();
      setEntries(json.data || []);
      setCount(json.count || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableFilter, actionFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(count / perPage);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-soft-black">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track all admin actions across the system
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={tableFilter}
          onChange={(e) => { setTableFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-soft-black"
        >
          <option value="">All Tables</option>
          <option value="bookings">Bookings</option>
          <option value="inquiries">Inquiries</option>
          <option value="packages">Packages</option>
          <option value="tours">Tours</option>
          <option value="properties">Properties</option>
          <option value="destinations">Destinations</option>
          <option value="suppliers">Suppliers</option>
          <option value="media_assets">Media</option>
          <option value="blog_posts">Blog</option>
          <option value="admin_profiles">Users</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-soft-black"
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>

        <span className="text-sm text-gray-400 self-center ml-auto">
          {count} total entries
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-gray-400">Loading audit log...</div>
      )}

      {/* Empty */}
      {!loading && !error && entries.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No audit entries found.
        </div>
      )}

      {/* Table */}
      {!loading && entries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Table</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Record</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Admin</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ACTION_COLORS[entry.action] || "text-gray-600 bg-gray-50 border-gray-200"}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                      {entry.tableName}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-gray-500 font-mono">
                        {entry.recordId ? entry.recordId.slice(0, 8) + "…" : "—"}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {entry.performedBy?.fullName || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(entry.oldData || entry.newData) && (
                        <button
                          onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                          className="text-xs text-earth hover:text-earth-dark transition-colors"
                        >
                          {expanded === entry.id ? "Hide" : "View"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded detail panels */}
          {expanded && (
            <div className="border-t border-gray-100 bg-gray-50/30 p-4">
              {entries
                .filter((e) => e.id === expanded)
                .map((entry) => (
                  <div key={entry.id} className="grid grid-cols-2 gap-4 text-xs">
                    {entry.oldData && (
                      <div>
                        <h4 className="font-medium text-gray-500 mb-1 uppercase tracking-wider text-[10px]">Previous Values</h4>
                        <pre className="bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-48 text-gray-700">
                          {JSON.stringify(entry.oldData, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.newData && (
                      <div>
                        <h4 className="font-medium text-gray-500 mb-1 uppercase tracking-wider text-[10px]">New Values</h4>
                        <pre className="bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-48 text-gray-700">
                          {JSON.stringify(entry.newData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
              <span className="text-xs text-gray-400">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
