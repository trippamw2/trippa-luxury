"use client";

import { useState, useRef } from "react";
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { useToast } from "./Toast";

interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
}

interface Props {
  table: string;
  label?: string;
  /** Optional field mapping: CSV header → DB column. Auto-detected if omitted. */
  fieldMapping?: Record<string, string>;
}

export function ImportCsv({ table, label = "Import CSV", fieldMapping }: Props) {
  const [open, setOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (results.errors.length > 0) {
          toast(`CSV parse error: ${results.errors[0].message}`, "error");
          return;
        }
        const hdrs = results.meta.fields || [];
        if (hdrs.length === 0) {
          toast("CSV appears empty or has no headers", "error");
          return;
        }
        setHeaders(hdrs);
        setParsedRows(results.data as Record<string, string>[]);
        setResult(null);
      },
      error(err) {
        toast(`Failed to read CSV: ${err.message}`, "error");
      },
    });
  };

  const handleImport = async () => {
    if (!parsedRows || parsedRows.length === 0) return;
    setImporting(true);
    setResult(null);

    // Map CSV headers → DB columns
    const mapHeader = (h: string) => fieldMapping?.[h] ?? h;

    const rows = parsedRows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [header, value] of Object.entries(row)) {
        const col = mapHeader(header);
        mapped[col] = value;
      }
      return mapped;
    });

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, rows }),
      });
      const data: ImportResult & { error?: string } = await res.json();
      if (res.ok) {
        setResult(data);
        toast(`Imported ${data.success} rows${data.errors.length > 0 ? ` (${data.errors.length} errors)` : ""}`, data.errors.length === 0 ? "success" : "info");
      } else {
        toast(data.error || "Import failed", "error");
      }
    } catch (err: any) {
      toast(`Import error: ${err.message}`, "error");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setParsedRows(null);
    setHeaders([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-sand-light text-sm text-earth hover:bg-warm-white hover:text-soft-black transition-colors"
        title={label}
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-soft-black/50 flex items-center justify-center z-50 p-4"
          onClick={close}
        >
          <div
            className="bg-cream border border-sand-light w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-sand-light flex-shrink-0">
              <h2 className="text-xl font-bold text-soft-black">{label}</h2>
              <button onClick={close} className="text-earth hover:text-soft-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!parsedRows ? (
                /* Step 1: Pick file */
                <div
                  className="border-2 border-dashed border-sand-light p-12 text-center cursor-pointer hover:border-gold transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileSpreadsheet className="w-12 h-12 text-earth/40 mx-auto mb-3" />
                  <p className="text-sm text-earth mb-1">
                    Click to select a <strong>.csv</strong> file
                  </p>
                  <p className="text-xs text-earth/60">
                    First row must contain column headers
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFile}
                  />
                </div>
              ) : (
                /* Step 2: Preview & Import */
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-earth">
                      <strong>{parsedRows.length}</strong> rows ·{" "}
                      <strong>{headers.length}</strong> columns
                      <span className="text-xs text-earth/60 ml-2">
                        ({headers.join(", ")})
                      </span>
                    </p>
                    <button
                      onClick={reset}
                      className="text-xs text-gold hover:underline"
                    >
                      Choose different file
                    </button>
                  </div>

                  {/* Preview table */}
                  <div className="overflow-x-auto border border-sand-light bg-white max-h-64">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-warm-white border-b border-sand-light">
                          <th className="px-3 py-2 text-left text-earth font-medium">#</th>
                          {headers.slice(0, 8).map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-earth font-medium whitespace-nowrap">
                              {fieldMapping?.[h] || h}
                            </th>
                          ))}
                          {headers.length > 8 && (
                            <th className="px-3 py-2 text-left text-earth font-medium">
                              +{headers.length - 8} more
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sand-light/60">
                        {parsedRows.slice(0, 10).map((row, i) => (
                          <tr key={i} className="hover:bg-warm-white/50">
                            <td className="px-3 py-2 text-earth">{i + 1}</td>
                            {headers.slice(0, 8).map((h) => (
                              <td key={h} className="px-3 py-2 text-soft-black max-w-[160px] truncate">
                                {row[h] || "—"}
                              </td>
                            ))}
                            {headers.length > 8 && (
                              <td className="px-3 py-2 text-earth">…</td>
                            )}
                          </tr>
                        ))}
                        {parsedRows.length > 10 && (
                          <tr className="bg-warm-white/50">
                            <td colSpan={Math.min(headers.length, 8) + 1} className="px-3 py-2 text-center text-earth text-xs">
                              … and {parsedRows.length - 10} more rows
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Results */}
                  {result && (
                    <div className={`p-4 border text-sm ${result.errors.length === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                      <div className="flex items-center gap-2 font-medium mb-1">
                        {result.errors.length === 0 ? (
                          <><CheckCircle className="w-4 h-4" /> Import complete</>
                        ) : (
                          <><AlertCircle className="w-4 h-4" /> Import completed with errors</>
                        )}
                      </div>
                      <p className="text-xs">{result.success} rows imported successfully</p>
                      {result.errors.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          {result.errors.map((e, i) => (
                            <p key={i} className="text-xs text-red-600">Row {e.row}: {e.message}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-sand-light flex-shrink-0">
              <button
                onClick={close}
                className="flex-1 px-4 py-2.5 border border-sand-light text-earth text-sm hover:bg-warm-white transition-colors"
              >
                Cancel
              </button>
              {parsedRows && !result && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 px-4 py-2.5 bg-gold text-soft-black text-sm font-medium hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                  ) : (
                    <>Import {parsedRows.length} rows</>
                  )}
                </button>
              )}
              {result && (
                <button
                  onClick={close}
                  className="flex-1 px-4 py-2.5 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black/90 transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
