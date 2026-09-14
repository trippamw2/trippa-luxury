// ─── Email delivery log (admin) ────────────────────────────────────────────
// GET /api/admin/email-log?status=failed&limit=50&offset=0
// Admin-only view of every Brevo send attempt: status, recipient, subject,
// message id, and the error on failure. Makes a broken email pipeline visible
// in the admin panel instead of a silent void.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { mapKeysToCamel } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin({ module: "settings", minRole: "admin" });
    const supabase = createAdminClient();

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = supabase
      .from("email_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === "sent" || status === "failed") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching email_log:", error);
      // The table may not exist yet if migration 023 hasn't been applied.
      if (error.code === "42P01" || /relation .* does not exist/.test(error.message)) {
        return NextResponse.json(
          {
            data: [],
            count: 0,
            error: "email_log table missing — apply migration 023_email_log.sql",
          },
          { status: 200 }
        );
      }
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
    console.error("Error in GET /api/admin/email-log:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}