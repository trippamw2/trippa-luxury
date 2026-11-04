/**
 * Serialize structured data for a `<script type="application/ld+json">` block.
 *
 * `JSON.stringify` alone is not safe inside a script element. A value that
 * contains `</script>` closes the element early, and everything after it is
 * parsed as markup — stored XSS from what looks like inert SEO data. Escaping
 * `<`, `>` and `&` as their JSON unicode escapes keeps the payload valid JSON
 * while making it impossible to terminate the surrounding element or open a
 * comment/entity.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
