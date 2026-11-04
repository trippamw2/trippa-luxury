/**
 * Amendment application rules.
 *
 * An amendment stores the change as text (`old_value` / `new_value`); applying
 * it must write the correct database type. Keeping the allowlist and the
 * coercion here means both the route and its tests exercise the same rules, and
 * an arbitrary field can never be written through the apply endpoint.
 */

const BOOKING_STATUSES = [
  "provisional",
  "deposit_paid",
  "confirmed",
  "balance_due",
  "paid",
  "in_progress",
  "completed",
  "cancelled",
  "refunded",
] as const;

const NUMBER_FIELDS = new Set([
  "total_amount",
  "deposit_amount",
  "balance_amount",
  "final_amount",
  "discount_amount",
]);

const INTEGER_FIELDS = new Set(["guests_count", "duration_nights"]);

const DATE_FIELDS = new Set(["start_date", "end_date", "deposit_due_date", "balance_due_date"]);

const TEXT_FIELDS = new Set([
  "client_name",
  "client_email",
  "client_phone",
  "client_country",
  "destination",
  "room_type",
  "currency",
  "special_requests",
  "dietary_requirements",
  "room_preferences",
  "internal_notes",
  "cancellation_reason",
  "discount_reason",
  "deposit_method",
  "deposit_notes",
]);

/** Fields that must never be nulled by applying an amendment. */
const REQUIRED_FIELDS = new Set(["client_name", "currency", "status"]);

export type CoercedAmendment =
  | { ok: true; value: string | number | null }
  | { ok: false; error: string };

/** Convert an amendment's textual new value into the booking column's type. */
export function coerceAmendmentValue(field: string, raw: string | null): CoercedAmendment {
  if (raw === null || raw.trim() === "") {
    if (REQUIRED_FIELDS.has(field)) {
      return { ok: false, error: `${field} cannot be empty` };
    }
    return { ok: true, value: null };
  }
  const trimmed = raw.trim();

  if (field === "status") {
    if (!(BOOKING_STATUSES as readonly string[]).includes(trimmed)) {
      return { ok: false, error: `Unknown booking status: ${trimmed}` };
    }
    return { ok: true, value: trimmed };
  }
  if (NUMBER_FIELDS.has(field)) {
    const parsed = Number(trimmed.replace(/[,\s]/g, ""));
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { ok: false, error: `${field} must be a non-negative number` };
    }
    return { ok: true, value: parsed };
  }
  if (INTEGER_FIELDS.has(field)) {
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return { ok: false, error: `${field} must be a non-negative whole number` };
    }
    return { ok: true, value: parsed };
  }
  if (DATE_FIELDS.has(field)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || Number.isNaN(Date.parse(trimmed))) {
      return { ok: false, error: `${field} must be a YYYY-MM-DD date` };
    }
    return { ok: true, value: trimmed };
  }
  if (TEXT_FIELDS.has(field)) {
    return { ok: true, value: trimmed };
  }
  return { ok: false, error: `Field ${field} cannot be applied from an amendment` };
}

/** True when the booking has drifted from the value the amendment recorded. */
export function hasAmendmentDrifted(
  currentValue: unknown,
  recordedOldValue: string | null
): boolean {
  if (recordedOldValue === null) return false;
  return String(currentValue ?? "").trim() !== recordedOldValue.trim();
}
