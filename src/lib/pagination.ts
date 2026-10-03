/**
 * Canonical pagination bounds for list endpoints.
 *
 * These live apart from `api-helpers` because they are needed by any list
 * implementation, not only the shared admin handlers: `workflow-persistence`
 * builds its own query, and it had the same unbounded-by-default bug until it
 * started using these too.
 */

/** Page size used when the caller does not ask for one. */
export const DEFAULT_PAGE_SIZE = 50;
/** Hard ceiling, so `?limit=10000000` cannot ask the database for every row. */
export const MAX_PAGE_SIZE = 200;

/** Columns a caller may sort by. Anything else falls back to recency. */
const SORTABLE_COLUMNS = new Set([
  "created_at",
  "updated_at",
  "name",
  "title",
  "full_name",
  "client_name",
  "status",
  "amount",
  "total_amount",
  "booking_reference",
  "slug",
  "email",
]);

/**
 * Page size, clamped and de-NaN'd. Accepts a raw query value or an already
 * parsed number, because some callers build their own query layer.
 *
 * An absent, unparseable or negative value falls back to the default rather than
 * becoming `NaN`. This matters more than it looks: the usual consumer is
 * `if (limit) query.limit(limit)`, and `NaN` is falsy, so an unvalidated
 * `?limit=abc` silently drops the bound and returns the whole table.
 */
export function clampLimit(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined || raw === "") return DEFAULT_PAGE_SIZE;
  const parsed = typeof raw === "number" ? raw : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

/** Offset from a query parameter. Absent, junk and negative values start at 0. */
export function clampOffset(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  const parsed = typeof raw === "number" ? raw : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

/**
 * Sort order from a query parameter, restricted to known columns so the value
 * cannot be used to probe the schema or force a pathological sort.
 */
export function resolveOrderBy(raw: string | null | undefined): {
  column: string;
  direction: "asc" | "desc";
} {
  if (!raw) return { column: "created_at", direction: "desc" };

  const [rawColumn, rawDirection] = raw.split(":");
  const column = String(rawColumn ?? "").trim().toLowerCase();
  if (!SORTABLE_COLUMNS.has(column)) {
    return { column: "created_at", direction: "desc" };
  }
  return {
    column,
    direction: rawDirection?.trim().toLowerCase() === "asc" ? "asc" : "desc",
  };
}

/** Query params that steer the list itself rather than filtering the rows. */
const LIST_RESERVED_PARAMS = new Set(["limit", "offset", "order_by"]);

function toSnakeCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

/**
 * Build the filter map for a list request, from allowlisted columns only.
 *
 * Previously every unrecognised query param became `.eq(key, value)`. That
 * turned a typo (`?statsu=paid`) or a cache-buster (`?_=1712`) into a request
 * for a column that does not exist, which fails the whole query with a 500.
 * An endpoint now opts in to filtering by naming its columns.
 */
export function collectListFilters(
  params: URLSearchParams,
  allowedColumns: readonly string[],
): Record<string, string> {
  const filters: Record<string, string> = {};
  if (allowedColumns.length === 0) return filters;

  const allowed = new Set(allowedColumns.map(toSnakeCase));

  for (const key of params.keys()) {
    if (LIST_RESERVED_PARAMS.has(key)) continue;
    const column = toSnakeCase(key);
    if (!allowed.has(column)) continue;
    const value = params.get(key);
    if (value !== undefined && value !== null && value !== "") {
      filters[column] = value;
    }
  }

  return filters;
}