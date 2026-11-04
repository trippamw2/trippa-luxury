import { NextRequest, NextResponse } from "next/server";
import { handleCreate, mapKeysToCamel } from "@/lib/api-helpers";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureGuestAuthUser } from "@/lib/guest-auth-provision";

const TABLE = "bookings";

const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 500;

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

/**
 * The guest's address from a booking payload, or null when it carries none.
 *
 * The admin editor posts `client_email` (snake_case, the column name);
 * `clientEmail` is accepted too, because the generic admin helpers accept
 * both spellings. A booking without an address has no guest to provision.
 */
function readClientEmail(body: Record<string, unknown>): string | null {
  const raw = body.client_email ?? body.clientEmail;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * GET /api/admin/bookings
 *
 * Archived bookings are hidden by default: the operation archives financial
 * records instead of deleting them, so they must not clutter the working list.
 * `?include_archived=true` returns both, `?archived=only` returns the archive.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin({ module: "bookings", minRole: "agent" });
    const url = new URL(request.url);
    const archivedMode = url.searchParams.get("archived");
    const includeArchived = url.searchParams.get("include_archived") === "true";
    const limit = clampInt(url.searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = clampInt(url.searchParams.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER);

    const supabase = createAdminClient();
    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (archivedMode === "only") {
      query = query.not("archived_at", "is", null);
    } else if (!includeArchived) {
      query = query.is("archived_at", null);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error(`Error fetching ${TABLE}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: mapKeysToCamel(data || []), count: count || 0 });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/bookings:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await handleCreate(TABLE, body, request);

  // Guest portal access: the booking is where the guest's address enters the
  // system, so the portal's auth user is provisioned from the booking side.
  // The portal's own login flow never creates users (it only signs in
  // addresses that already exist), so this is the only place a guest can be
  // given portal access.
  //
  // Only a successful create provisions, and the call is isolated: the helper
  // never throws, and the try/catch makes sure of it. A provisioning problem
  // must never turn a created booking into a failed request.
  if (result.status === 201) {
    const email = readClientEmail(body);
    if (email) {
      try {
        const outcome = await ensureGuestAuthUser(email);
        if (outcome.failed) {
          console.error(
            `Guest portal provisioning failed for ${email}: ${outcome.reason ?? "unknown_error"}`
          );
        } else {
          console.log(
            `Guest portal provisioning for ${email}: ${outcome.created ? "created" : "skipped"}`
          );
        }
      } catch (err) {
        console.error(`Guest portal provisioning error for ${email}:`, err);
      }
    }
  }

  return result;
}
