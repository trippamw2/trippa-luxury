// ─── Guest portal backfill ────────────────────────────────────────────────
// POST /api/admin/guest-portal/backfill
//
// The guest portal signs a guest in with an OTP that never creates an account
// (`shouldCreateUser: false` in src/lib/guest-auth.ts), so the login form can
// neither mint an account nor be used to enumerate who booked a trip. The auth
// user is therefore provisioned from the booking side - at payment settlement
// and on admin booking writes - and this endpoint is the repair tool for the
// bookings that predate that wiring.
//
// What it does:
//   1. reads the distinct guest addresses on `bookings` (server-side query),
//   2. asks `ensureGuestAuthUser` to make sure each of them has an auth user,
//   3. reports what happened.
//
// What it never does: it creates auth users and nothing else. No booking row
// is written, no staff profile is created, no email is sent, and nothing is
// ever deleted or deactivated.
//
// Request body (optional): { "offset": <number> }
//   The batch is the first 500 distinct addresses in booking order. `offset`
//   skips that many distinct addresses first, so an operator can walk a longer
//   address list in consecutive batches (offset 0, 500, 1000, ...). A bare
//   POST - or a body that is not JSON - runs the first batch.
//
// Response: { attempted, created, skipped, failed, failures: [{email, reason}], hasMore }
//
// Ordering: oldest booking first. `bookings.created_at` ascending, with
// `bookings.id` ascending as the tie-break, so the batch is deterministic and
// a re-run always covers the same addresses.
//
// The DISTINCT and the lower-casing happen in the route, not in the query:
// PostgREST can only de-duplicate a raw column, so `select distinct
// lower(client_email)` is not expressible through the client, and the
// lower-casing uses the repo's canonical `normalizeEmail` (trim + lowercase)
// - the same address identity the guest portal compares against in
// src/app/api/guest/bookings/route.ts. One guest with three bookings is one
// address.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, getIpFromRequest } from "@/lib/audit";
import {
  ensureGuestAuthUser,
  type GuestAuthProvisionResult,
} from "@/lib/guest-auth-provision";
import { normalizeEmail } from "@/lib/email-consent";

/** The hard cap: how many distinct addresses one run may touch. */
const MAX_EMAILS_PER_RUN = 500;

/** How many booking rows are read per query while collecting addresses. */
const SCAN_PAGE_SIZE = 1000;

/** The audit-log table name this run is recorded under. */
const AUDIT_TABLE = "guest_portal_backfill";

/** One address that could not be provisioned, and why. */
type BackfillFailure = {
  email: string;
  reason: string;
};

/**
 * Narrow an unknown row to its `client_email`.
 *
 * The rows come back from an untyped Supabase client, so they are read as
 * `unknown` and narrowed here rather than cast to a concrete type.
 */
function readClientEmail(row: unknown): string | null {
  if (typeof row !== "object" || row === null) return null;
  const value = (row as Record<string, unknown>).client_email;
  return typeof value === "string" ? value : null;
}

/**
 * The optional batch offset from the request body.
 *
 * The body is optional: a bare POST (or a body that is not JSON) runs the
 * first batch. A malformed offset is ignored rather than rejected, so a stray
 * body can never break a run.
 */
async function readBatchOffset(request: NextRequest): Promise<number> {
  try {
    const body = (await request.json()) as { offset?: unknown } | null;
    const offset = body?.offset;
    if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0) return 0;
    return offset;
  } catch {
    return 0;
  }
}

/**
 * Collect the distinct guest addresses on `bookings`, oldest first.
 *
 * The query is server-side and bounded: the rows are read in pages of
 * `SCAN_PAGE_SIZE`, the addresses are normalised and de-duplicated as they
 * arrive, and the scan stops as soon as the batch (plus one address, which is
 * enough to know another run is needed) is covered.
 *
 * @param start How many distinct addresses to skip before the batch begins.
 */
async function collectBookingEmails(
  supabase: ReturnType<typeof createAdminClient>,
  start: number
): Promise<{ emails: string[]; hasMore: boolean }> {
  const emails: string[] = [];
  const seen = new Set<string>();
  const limit = start + MAX_EMAILS_PER_RUN;
  let rowOffset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("bookings")
      .select("client_email")
      .not("client_email", "is", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(rowOffset, rowOffset + SCAN_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rows: unknown[] = Array.isArray(data) ? (data as unknown[]) : [];

    for (const row of rows) {
      const raw = readClientEmail(row);
      if (!raw) continue;
      const email = normalizeEmail(raw);
      if (!email || seen.has(email)) continue;
      seen.add(email);
      emails.push(email);
    }

    // One address past the batch is enough to know that a further run is
    // needed, so the scan stops here instead of walking the whole table.
    if (emails.length > limit) {
      return { emails: emails.slice(start, limit), hasMore: true };
    }
    // A short page means there are no further booking rows to read.
    if (rows.length < SCAN_PAGE_SIZE) break;
    rowOffset += SCAN_PAGE_SIZE;
  }

  return { emails: emails.slice(start), hasMore: false };
}

export async function POST(request: NextRequest) {
  try {
    // Admin-only: this mints auth users, so it is gated at the same level as
    // the staff directory (module "users", minimum role "admin").
    const auth = await requireAdmin({ module: "users", minRole: "admin" });

    const start = await readBatchOffset(request);
    const { emails, hasMore } = await collectBookingEmails(createAdminClient(), start);

    let attempted = 0;
    let created = 0;
    let skipped = 0;
    let failed = 0;
    const failures: BackfillFailure[] = [];

    for (const email of emails) {
      attempted += 1;

      let result: GuestAuthProvisionResult;
      try {
        result = await ensureGuestAuthUser(email);
      } catch (err: unknown) {
        // The helper never throws, but one address must never abort the run.
        failed += 1;
        failures.push({
          email,
          reason: err instanceof Error ? err.message : "unknown_error",
        });
        continue;
      }

      if (result.created) {
        created += 1;
        continue;
      }
      if (result.skipped) {
        // The address is invalid, or it already has an auth user.
        skipped += 1;
        continue;
      }

      // Neither created nor skipped: the address was NOT provisioned. That is
      // either a real failure (the helper reports `failed: true` with a
      // reason) or the helper's creation budget (`reason: "creation_cap"` -
      // 50 creations per 60s). The response shape has no separate bucket for
      // the cap, so it is counted as a failure carrying the reason
      // "creation_cap": visible in `failures`, and re-runnable once the
      // window has rolled - never silently dropped.
      failed += 1;
      failures.push({ email, reason: result.reason ?? "unknown_error" });
    }

    // The run is recorded so an operator can see what a backfill did.
    await createAuditLog({
      tableName: AUDIT_TABLE,
      action: "CREATE",
      newData: {
        attempted,
        created,
        skipped,
        failed,
        has_more: hasMore,
        failures,
      },
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({ attempted, created, skipped, failed, failures, hasMore });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in POST /api/admin/guest-portal/backfill:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
