import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

/**
 * POST /api/admin/import
 *
 * Bulk-import rows into any admin table.
 * Body: { table: string; rows: Record<string, unknown>[] }
 *
 * Supported tables (validated against an allowlist).
 */
const ALLOWED_TABLES = new Set([
  "destinations",
  "properties",
  "tours",
  "packages",
  "blog_posts",
  "experiences",
  "suppliers",
  "guest_profiles",
]);

export async function POST(request: NextRequest) {
  try {
    await requireAdmin({ module: "content", minRole: "editor" });
    const supabase = createAdminClient();
    const body = await request.json();
    const { table, rows } = body;

    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json(
        { error: `Unsupported table "${table}". Allowed: ${[...ALLOWED_TABLES].join(", ")}` },
        { status: 400 }
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
    }

    if (rows.length > 500) {
      return NextResponse.json({ error: "Maximum 500 rows per import" }, { status: 400 });
    }

    const results: { success: number; errors: { row: number; message: string }[] } = {
      success: 0,
      errors: [],
    };

    // Insert in batches of 50
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { data, error } = await supabase.from(table).insert(batch).select();

      if (error) {
        // Attribute failure to each row in the batch
        for (let j = 0; j < batch.length; j++) {
          results.errors.push({ row: i + j + 1, message: error.message });
        }
      } else {
        results.success += (data || []).length;
      }
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Import error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
