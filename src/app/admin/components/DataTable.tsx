"use client";

import { useState, useMemo, ReactNode, Key } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonTable } from "./Skeleton";
import { exportToCsv } from "@/lib/csv-export";
import { ImportCsv } from "./ImportCsv";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  loading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (item: T) => void;
  exportable?: boolean;
  exportFilename?: string;
  importable?: boolean;
  importTable?: string;
}

/** Read a field by string key from a row of any object type. */
function getField<T extends object>(item: T, key: string): unknown {
  return (item as Record<string, unknown>)[key];
}

export function DataTable<T extends object>({
  columns,
  data,
  keyField = "id",
  searchable = false,
  searchPlaceholder = "Search...",
  pageSize = 50,
  loading = false,
  emptyState,
  onRowClick,
  exportable = false,
  exportFilename = "export",
  importable = false,
  importTable,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  // Filter
  const filtered = useMemo(() => {
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((item) =>
      columns.some((col) => {
        const val = getField(item, col.key);
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, searchQuery, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = getField(a, sortKey);
      const bVal = getField(b, sortKey);
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = useMemo(() => {
    const start = page * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const resetSearch = () => {
    setSearchQuery("");
    setPage(0);
  };

  // Reset page when data changes
  if (page >= totalPages && totalPages > 0) setPage(0);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4">
        {searchable && (
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 border border-sand-light text-sm focus:outline-none focus:border-gold bg-white transition-colors"
            />
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {importable && importTable && (
            <ImportCsv table={importTable} />
          )}
          {exportable && !loading && sorted.length > 0 && (
            <button
              onClick={() => exportToCsv(sorted, columns, exportFilename)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-sand-light text-sm text-earth hover:bg-warm-white hover:text-soft-black transition-colors"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-sand-light overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={6} cols={columns.length} />
          </div>
        ) : sorted.length === 0 ? (
          emptyState || (
            <div className="py-12 text-center text-sm text-earth">
              {searchQuery ? (
                <div>
                  <p>No results for &ldquo;{searchQuery}&rdquo;</p>
                  <button onClick={resetSearch} className="text-gold hover:underline mt-1">Clear search</button>
                </div>
              ) : (
                <p>No data found.</p>
              )}
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-warm-white border-b border-sand-light">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "text-left px-4 py-3 font-medium text-earth text-xs uppercase tracking-wider",
                        col.sortable !== false && "cursor-pointer select-none hover:text-soft-black transition-colors",
                        col.headerClassName
                      )}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {col.header}
                        {sortKey === col.key ? (
                          sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          col.sortable !== false && <ArrowUpDown className="w-3 h-3 text-earth/40" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-light/60">
                {paged.map((item, i) => (
                  <tr
                    key={(getField(item, keyField) ?? i) as Key}
                    className={cn(
                      "transition-colors",
                      onRowClick ? "cursor-pointer hover:bg-warm-white" : "hover:bg-warm-white/50"
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-3 text-soft-black", col.className)}>
                        {col.render ? col.render(item) : (getField(item, col.key) as ReactNode) ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-earth">
          <span className="text-xs">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 hover:bg-warm-white rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              // Show pages around current page
              const start = Math.max(0, Math.min(page - 3, totalPages - 7));
              const pg = start + i;
              if (pg >= totalPages) return null;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={cn(
                    "w-7 h-7 text-xs rounded",
                    pg === page ? "bg-gold text-soft-black font-medium" : "hover:bg-warm-white"
                  )}
                >
                  {pg + 1}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 hover:bg-warm-white rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
