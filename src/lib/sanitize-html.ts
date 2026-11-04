/**
 * Conservative sanitizer for admin-authored blog HTML.
 *
 * The journal renders `post.content` with `dangerouslySetInnerHTML`. The content
 * is written through the admin rich-text editor, but "admin-authored" is not the
 * same as "safe": a compromised staff account, a paste from an untrusted source,
 * or a future import path can all store markup that runs in every reader's
 * browser. The editor's own menu is not a security boundary.
 *
 * This is deliberately a denylist, not a full HTML parser. A full allowlist
 * parser is the right tool and is what a dedicated sanitizer library provides;
 * we do not add one here, so the contract is narrower: remove the constructs
 * that execute rather than trying to prove the remainder is safe. Ordinary
 * formatting (`p`, `h2`, `h3`, `ul`, `li`, `a`, `strong`, `em`, `blockquote`,
 * `img`) passes through untouched.
 *
 * It is applied at render time, so it also covers rows written before it
 * existed.
 */

/** Elements that can execute code, load remote documents, or submit data. */
const DANGEROUS_ELEMENTS = [
  "script",
  "style",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "option",
  "link",
  "meta",
  "base",
  "svg",
  "math",
] as const;

const elementNames = DANGEROUS_ELEMENTS.join("|");

/** A whole dangerous element, including its body (e.g. `<script>…</script>`). */
const DANGEROUS_BLOCK = new RegExp(
  `<\\s*(?:${elementNames})\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*(?:${elementNames})\\s*>`,
  "gi"
);

/** A stray opening/closing tag, including self-closing and unclosed variants. */
const DANGEROUS_TAG = new RegExp(`<\\s*\\/?\\s*(?:${elementNames})\\b[^>]*>`, "gi");

/** Inline event handlers: `onerror`, `onclick`, `onload`, … */
const EVENT_HANDLER_ATTRIBUTE = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** URL attributes carrying a script-capable scheme. */
const SCRIPT_URL_ATTRIBUTE =
  /\s(?:href|src|xlink:href|action|formaction|poster)\s*=\s*(?:"\s*(?:javascript|vbscript|data):[^"]*"|'\s*(?:javascript|vbscript|data):[^']*'|(?:javascript|vbscript|data):[^\s>]+)/gi;

export function sanitizeBlogHtml(html: string): string {
  if (!html) return "";

  return html
    .replace(DANGEROUS_BLOCK, "")
    .replace(DANGEROUS_TAG, "")
    .replace(EVENT_HANDLER_ATTRIBUTE, "")
    .replace(SCRIPT_URL_ATTRIBUTE, "");
}
