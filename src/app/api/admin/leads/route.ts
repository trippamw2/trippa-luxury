import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleCreate, joinSingle, mapKeysToCamel } from "@/lib/api-helpers";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

const TABLE = "leads";

/**
 * assigned_to is a raw admin_profiles id; the admin UI shows the assignee's
 * name, so it is resolved through the profile relation here.
 */
const SELECT_WITH_RELATIONS =
  "id, full_name, email, phone, country, traveller_type, lead_status, priority, estimated_budget, preferred_start_date, assigned_to, last_contacted_at, next_follow_up, source, created_at, guest_profile_id, inquiry_id, admin_profiles!leads_assigned_to_fkey(full_name)";

type LeadRow = Record<string, unknown> & {
  admin_profiles?: { full_name?: string } | null;
};

function mapRow(item: LeadRow) {
  return {
    ...mapKeysToCamel(item),
    assignedName: joinSingle(item.admin_profiles)?.full_name ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Same guard handleGetList("leads") applied via TABLE_AUTH.
    await requireAdmin({ module: "leads", minRole: "agent" });
    const supabase = createAdminClient();

    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    let query = supabase
      .from(TABLE)
      .select(SELECT_WITH_RELATIONS, { count: "exact" })
      .order("created_at", { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching leads:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (data || []).map((row) => mapRow(row as LeadRow)),
      count: count || 0,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/leads:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return handleCreate(TABLE, body, request);
}
