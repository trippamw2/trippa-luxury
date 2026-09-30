// ─── UUID id safety ────────────────────────────────────────────────────────
// Several tables in this schema (system_events.entity_id, decisions.entity_id,
// system_gaps.related_entity_id) are UUID columns, but the domain uses slugs
// and order numbers. Postgres would reject a non-UUID with a 22P02 error and
// abort the whole statement — taking an otherwise-correct write down with it.
//
// So ids are validated at the boundary and carried in a JSONB payload when
// they are not real UUIDs, rather than force-cast into a column that will
// reject them. This lives in its own module because the identity rule is shared
// by every writer of those tables; duplicating the pattern per module is how
// one of them ends up cast instead of checked.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Return the value only if it is a real UUID, else null. Never throws. */
export function normalizeUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return UUID_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null;
}
