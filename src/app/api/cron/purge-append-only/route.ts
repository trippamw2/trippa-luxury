import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TABLES = ["system_events", "supplier_performance"];
const OLDER_THAN_DAYS = 90;
const MAX_ROWS = 5000;

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
    const results: Record<string, unknown> = {};

    for (const table of TABLES) {
      const { data, error } = await supabase.rpc("purge_append_only_rows", {
        p_table: table,
        p_older_than_days: OLDER_THAN_DAYS,
        p_reason: "scheduled retention purge",
        p_max_rows: MAX_ROWS,
      });
      if (error) {
        console.error(`Cron: purge ${table} error:`, error);
        results[table] = { error: error.message };
      } else {
        results[table] = data;
      }
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    console.error("Cron: purge-append-only error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}