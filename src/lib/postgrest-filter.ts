/**
 * Escaping for values interpolated into a PostgREST filter expression.
 *
 * `supabase.from(t).or("col.ilike.%value%")` takes a *filter grammar string*, not
 * a parameter. PostgREST parses `,` as the separator between conditions, `.` as
 * the separator between column/operator/value, and `(`/`)` as grouping. A search
 * term carrying any of those does not merely fail to match, it changes the shape
 * of the query:
 *
 *   search = "%,guest_email.not.is.null"
 *     -> or=(guest_name.ilike.*%%,guest_email.ilike.*%%*,guest_email.not.is.null)
 *
 * so the term stops being a substring search and becomes an extra condition.
 *
 * `escapeIlikePattern` makes the value inert by escaping the LIKE metacharacters
 * (so the search stays literal) and dropping the grammar characters (so the
 * expression keeps its shape).
 */

/**
 * Characters that can restructure a PostgREST filter expression, and so must
 * never reach it.
 *
 * `,` starts another condition, `(`/`)` group conditions, `"` opens a quoted
 * value, and `&`/`=`/`?`/`#` would inject a further query parameter if the value
 * is ever placed into a URL unencoded.
 *
 * `.` is deliberately NOT in this set. Inside `column.operator.value` the value
 * is everything after the second `.`, so a dot is just a dot - and stripping it
 * breaks the searches this helper exists to make possible, such as
 * `martin@example.com`.
 */
const GRAMMAR_CHARS = /[,()"'&=?#]/g;

/** Longest search term worth sending; anything longer is a mistake or an attack. */
export const MAX_SEARCH_TERM_LENGTH = 200;

/**
 * Make a user-supplied term safe to interpolate into a PostgREST `ilike` pattern.
 *
 * Backslash is escaped first, otherwise the escapes added afterwards would be
 * escaped a second time.
 */
export function escapeIlikePattern(raw: string): string {
  const bounded = raw.slice(0, MAX_SEARCH_TERM_LENGTH);
  return bounded
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(GRAMMAR_CHARS, "");
}

/**
 * Build an `ilike` substring pattern (`%term%`) from raw user input.
 *
 * Pass the result to `.or()` / `.ilike()` rather than concatenating the term
 * yourself, so the escaping cannot be forgotten at the call site.
 */
export function ilikeSubstring(raw: string): string {
  return `%${escapeIlikePattern(raw)}%`;
}