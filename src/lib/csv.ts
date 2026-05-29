/**
 * Minimal CSV generation utility for admin exports.
 */

/**
 * Escape a value for CSV (handles commas, quotes, and newlines).
 */
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of objects to CSV string.
 * @param data Array of flat objects
 * @param columns Optional column definitions (key and label). If omitted, uses object keys.
 */
export function toCsv(
  data: Record<string, any>[],
  columns?: { key: string; label: string }[]
): string {
  if (!data || data.length === 0) return "";

  const cols = columns || Object.keys(data[0]).map((key) => ({ key, label: key }));

  const header = cols.map((c) => escapeCsv(c.label)).join(",");
  const rows = data.map((row) =>
    cols.map((c) => escapeCsv(row[c.key])).join(",")
  );

  return [header, ...rows].join("\r\n");
}

/**
 * Generate a filename with a timestamp.
 */
export function csvFilename(prefix: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `${prefix}-${date}.csv`;
}
