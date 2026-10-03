import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/cron/prune-rate-limits
 *
 * Deletes expired rows from `rate_limit_buckets` (migration 032).
 *
 * Why this job has to exist: the bucket key is derived from `x-forwarded-for`,
 * which the caller controls, so every distinct value a caller invents leaves a
 * row behind. The in-process limiter sweeps its own map; this table has no
 * equivalent, so without a sweep it grows until the database is the bottleneck —
 * which would aim a denial of service at the limiter instead of past it.
 *
 * Auth: Bearer token matching CRON_SECRET env var.
 *
 * Response:
 *   { deleted: number, passes: number, more: boolean, message: string }
 */

/** Rows per statement. Bounded in SQL so one call cannot lock the table. */
const BATCH_SIZE = 5_000;

/** Ceiling on batches per run, so a large backlog drains over several runs. */
const MAX_BATCHES = 20;

export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedToken = process.env.CRON_SECRET;

    if (!expectedToken) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
    }

    if (authToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    let deleted = 0;
    let passes = 0;

    // Drain in bounded batches. The SQL caps each statement and MAX_BATCHES keeps
    // a large backlog from turning into one long request.
    for (let pass = 0; pass < MAX_BATCHES; pass += 1) {
      // Counted before the call, so `passes` reports statements actually issued —
      // including the final one that found nothing left to delete.
      passes = pass + 1;

      const { data, error } = await supabase.rpc("prune_rate_limit_buckets", {
        p_max_rows: BATCH_SIZE,
      });

      if (error) {
        console.error("Cron: error pruning rate limit buckets:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const rows: unknown = data;
      const first: unknown = Array.isArray(rows) ? rows[0] : undefined;
      const batch =
        typeof first === "object" && first !== null && "deleted" in first
          ? Number((first as { deleted: unknown }).deleted)
          : 0;

      deleted += Number.isFinite(batch) ? batch : 0;

      // A short batch means the table is drained; another call would delete nothing.
      if (batch === 0) break;
    }

    // `passes` only reaches MAX_BATCHES by exhausting the loop, so this is true
    // only when the last statement still had rows to give.
    const more = passes >= MAX_BATCHES && deleted > 0;

    return NextResponse.json({
      deleted,
      passes,
      more,
      message: more
        ? `Pruned ${deleted} bucket(s); more remain, run again.`
        : `Pruned ${deleted} expired rate limit bucket(s).`,
    });
  } catch (err: unknown) {
    console.error("Cron: prune-rate-limits error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}