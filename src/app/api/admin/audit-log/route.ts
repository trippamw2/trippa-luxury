import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { mapKeysToCamel } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const url = new URL(request.url);
    const tableName = url.searchParams.get("table");
    const action = url.searchParams.get("action");
    const recordId = url.searchParams.get("record_id");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = supabase
      .from("audit_log")
      .select("*, performed_by:admin_profiles!audit_log_performed_by_fkey(full_name, role)", { count: "exact" });

    if (tableName) {
      query = query.eq("table_name", tableName);
    }
    if (action) {
      query = query.eq("action", action);
    }
    if (recordId) {
      query = query.eq("record_id", recordId);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching audit log:", error);
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
    console.error("Error in GET /api/admin/audit-log:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
