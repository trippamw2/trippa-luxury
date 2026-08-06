import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { mapKeysToCamel } from "@/lib/api-helpers";

/**
 * GET /api/admin/bookings/provisional-holds
 * Returns bookings that are stuck in "provisional" status beyond the hold duration (default 48h).
 *
 * Query params:
 *   - older_than_hours (number, default 48) : age threshold in hours
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const url = new URL(request.url);
    const olderThanHours = parseInt(url.searchParams.get("older_than_hours") || "48");

    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

    const { data, error, count } = await supabase
      .from("bookings")
      .select("*", { count: "exact" })
      .eq("status", "provisional")
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching provisional holds:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: mapKeysToCamel(data || []),
      count: count || 0,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET provisional-holds:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/bookings/provisional-holds
 * Batch-release (cancel) all stale provisional bookings older than the given threshold.
 *
 * Body:
 *   - older_than_hours (number, default 48)
 *   - dry_run (boolean, default true) : if true, only count matches without cancelling
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const body = await request.json();
    const olderThanHours = parseInt(body.older_than_hours || "48");
    const dryRun = body.dry_run !== false; // default to dry run

    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

    if (dryRun) {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "provisional")
        .lt("created_at", cutoff);

      return NextResponse.json({
        dryRun: true,
        affectedCount: count || 0,
        message: `${count || 0} provisional bookings would be released (cancelled).`,
      });
    }

    // Actually release: cancel stale provisionals
    const { data, error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancellation_reason: "Auto-released : provisional hold expired",
        cancelled_at: new Date().toISOString(),
      })
      .eq("status", "provisional")
      .lt("created_at", cutoff)
      .select();

    if (error) {
      console.error("Error releasing provisional holds:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      dryRun: false,
      affectedCount: data?.length || 0,
      message: `${data?.length || 0} provisional bookings released.`,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in POST provisional-holds:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
