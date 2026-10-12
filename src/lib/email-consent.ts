// ─── Email consent & suppression ─────────────────────────────────────────
// One place that answers "may we email this address?", so the campaign sender,
// the reminder stager and the dispatch route cannot each invent their own rule.
//
// Two questions, deliberately distinct:
//
//   purpose "marketing" — a newsletter/campaign. Blocked by ANY suppression,
//                         including a plain unsubscribe.
//   purpose "service"   — a receipt, confirmation, or reminder for a trip the
//                         guest actually booked. Blocked only by a hard stop
//                         (scope "all": complaint, bounce, operator block), so
//                         an unsubscribe never silently withholds a service
//                         message the guest still needs.
//
// Addresses are matched case-insensitively: everything is normalized before it
// is compared or stored, because `email_suppressions.email` has a plain unique
// index and two spellings of one address are one identity.

import { createAdminClient } from "@/lib/supabase/admin";

export type SuppressionScope = "marketing" | "all";
export type EmailPurpose = "marketing" | "service";

/** Lowercase + trim. The canonical form used for every comparison and write. */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * True if a suppression of this scope blocks mail for this purpose.
 * Pure — the whole rule in one testable place.
 */
export function suppressionBlocks(
  scope: SuppressionScope | undefined,
  purpose: EmailPurpose
): boolean {
  if (!scope) return false;
  return purpose === "marketing" ? true : scope === "all";
}

/**
 * Load the suppression scope for every address in one query.
 *
 * Throws on lookup failure rather than returning "nothing suppressed": a
 * marketing sender that cannot verify the do-not-email list must not guess, and
 * letting this throw is what lets each caller choose fail-closed (campaign,
 * dispatch) or fail-open (staging) deliberately.
 */
export async function loadSuppressions(
  emails: string[]
): Promise<Map<string, SuppressionScope>> {
  const normalized = Array.from(
    new Set(emails.map(normalizeEmail).filter((e) => e !== ""))
  );
  const map = new Map<string, SuppressionScope>();
  if (normalized.length === 0) return map;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_suppressions")
    .select("email, scope")
    .in("email", normalized);

  if (error) {
    throw new Error(`Suppression lookup failed: ${error.message}`);
  }

  for (const row of (data ?? []) as { email: string; scope: SuppressionScope }[]) {
    map.set(normalizeEmail(row.email), row.scope);
  }
  return map;
}

/** True if a single address is blocked for the purpose. Throws like loadSuppressions. */
export async function isEmailBlocked(
  email: string,
  purpose: EmailPurpose
): Promise<boolean> {
  const map = await loadSuppressions([email]);
  return suppressionBlocks(map.get(normalizeEmail(email)), purpose);
}

/**
 * Partition a recipient list into allowed and blocked for the purpose, in one
 * query. Returns the original (un-normalized) addresses so callers keep the
 * casing/name they started with.
 */
export async function partitionSuppressed(
  emails: string[],
  purpose: EmailPurpose
): Promise<{ allowed: string[]; blocked: string[] }> {
  const map = await loadSuppressions(emails);
  const allowed: string[] = [];
  const blocked: string[] = [];
  for (const email of emails) {
    if (suppressionBlocks(map.get(normalizeEmail(email)), purpose)) {
      blocked.push(email);
    } else {
      allowed.push(email);
    }
  }
  return { allowed, blocked };
}

/**
 * Record a hard stop (spam complaint, hard bounce, operator block). Overwrites
 * any existing row so a complaint upgrades a prior marketing-unsubscribe to a
 * full block.
 */
export async function hardSuppress(params: {
  email: string;
  reason: "bounce" | "complaint" | "manual";
  source?: string;
  note?: string;
  createdBy?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const email = normalizeEmail(params.email);
  if (!email) return { ok: false, error: "Empty email" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("email_suppressions").upsert(
    {
      email,
      scope: "all",
      reason: params.reason,
      source: params.source ?? null,
      note: params.note ?? null,
      created_by: params.createdBy ?? null,
    },
    { onConflict: "email" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Record an unsubscribe. Inserts a marketing-scope row if the address is not
 * already suppressed, and does NOT downgrade an existing hard stop — an
 * unsubscribe after a complaint must not re-open the address to marketing.
 */
export async function ensureMarketingSuppression(params: {
  email: string;
  source?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const email = normalizeEmail(params.email);
  if (!email) return { ok: false, error: "Empty email" };

  const supabase = createAdminClient();
  const { data: existing, error: readError } = await supabase
    .from("email_suppressions")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (existing) return { ok: true };

  const { error } = await supabase.from("email_suppressions").insert({
    email,
    scope: "marketing",
    reason: "unsubscribe",
    source: params.source ?? null,
  });
  // A concurrent insert racing us to the unique index is not a failure: the
  // address is suppressed either way.
  if (error && error.code !== "23505") return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Remove a marketing-scope suppression when an address re-subscribes. A hard
 * stop (scope "all") is left in place: opting back into a newsletter is not
 * consent to override a spam complaint.
 */
export async function liftMarketingSuppression(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("email_suppressions")
    .delete()
    .eq("email", normalized)
    .eq("scope", "marketing");

  if (error) {
    console.error("Failed to lift marketing suppression:", error.message);
  }
}
