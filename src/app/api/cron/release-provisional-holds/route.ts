import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/cron/release-provisional-holds
 *
 * Cron-job-friendly endpoint that auto-releases (cancels) all provisional
 * bookings older than the configured hold duration (default 48h).
 *
 * Designed to be called by Vercel Cron Jobs (or any scheduled task runner).
 *
 * Auth: Bearer token matching CRON_SECRET env var.
 *
 * Response:
 *   { released: number, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const olderThanHours = 48;
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

    // Release: cancel stale provisionals
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
      console.error("Cron: error releasing provisional holds:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const released = data?.length || 0;

    return NextResponse.json({
      released,
      message: `${released} provisional booking(s) auto-released.`,
    });
  } catch (err: unknown) {
    console.error("Cron: release-provisional-holds error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
