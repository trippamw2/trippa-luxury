// ─── KIVARA Brand Voice Transformer ──────────────────────────────────────
// Applies vocabulary replacement, tone rules, and department-specific styling.
// Can be used as a post-processing layer or integrated at composition time.

import { FORBIDDEN_WORDS, PHRASE_REPLACEMENTS } from "./rules";

// ─── Vocabulary Replacement ─────────────────────────────────────────

/**
 * Apply the KIVARA vocabulary replacement map to upgrade generic phrasing.
 */
export function upgradeVocabulary(text: string): string {
  let result = text;

  // Apply phrase replacements first (catch common patterns)
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Strip or flag any forbidden words from output.
 */
export function sanitiseForbidden(text: string): string {
  let result = text;
  for (const word of FORBIDDEN_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    result = result.replace(regex, (match) => `~~${match}~~`); // flag for review
  }
  return result;
}

/**
 * Full brand transformation pipeline.
 */
export function transform(text: string, options?: { detectForbidden?: boolean }): string {
  let result = text;

  // 1. Upgrade vocabulary
  result = upgradeVocabulary(result);

  // 2. Optionally detect forbidden words
  if (options?.detectForbidden) {
    result = sanitiseForbidden(result);
  }

  // 3. Remove excessive exclamation marks (luxury brands don't shout)
  result = result.replace(/!+/g, ".");
  // 4. Normalise multiple spaces
  result = result.replace(/  +/g, " ");

  return result.trim();
}

/**
 * Quick one-line brand transformation.
 */
export function luxury(text: string): string {
  return transform(text);
}
