// ─── Kivara CSV Export Utility ───────────────────────────────────────────
// Client-side CSV generation for admin list tables.

/**
 * Converts an array of objects to CSV string, respecting column order and headers.
 *
 * @param data - The array of data objects to export
 * @param columns - Column definitions with key and header for each column
 * @param filename - The exported filename (without extension)
 */
export function exportToCsv<T extends object>(
  data: T[],
  columns: { key: string; header: string }[],
  filename: string = "export"
): void {
  if (!data.length || !columns.length) return;

  // Build CSV rows
  const headerRow = columns.map((c) => escapeCsvField(c.header)).join(",");
  const dataRows = data.map((item) =>
    columns.map((col) => {
      const val: unknown = (item as Record<string, unknown>)[col.key];
      return escapeCsvField(val);
    }).join(",")
  );

  const csv = [headerRow, ...dataRows].join("\r\n");

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  // Escape if contains comma, newline, or double-quote
  if (str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
