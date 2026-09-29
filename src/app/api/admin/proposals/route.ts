import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleCreate, joinSingle, mapKeysToCamel } from "@/lib/api-helpers";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

const TABLE = "proposals";

/**
 * customer_name / journey_name are not columns on `proposals` - the admin UI
 * displays both, so they are resolved through the lead and journey relations
 * here instead of being faked client-side.
 */
const SELECT_WITH_RELATIONS =
  "id, proposal_reference, title, slug, status, total_investment, deposit_amount, balance_amount, currency, sent_date, viewed_date, accepted_date, expiry_date, sent_to_email, cover_image, created_at, updated_at, lead_id, journey_id, customer_id, leads(full_name), journeys(journey_name)";

type ProposalRow = Record<string, unknown> & {
  leads?: { full_name?: string } | null;
  journeys?: { journey_name?: string } | null;
};

function mapRow(item: ProposalRow) {
  return {
    ...mapKeysToCamel(item),
    customerName: joinSingle(item.leads)?.full_name ?? null,
    journeyName: joinSingle(item.journeys)?.journey_name ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Same guard handleGetList("proposals") applied via TABLE_AUTH.
    await requireAdmin({ module: "proposals", minRole: "agent" });
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
      console.error("Error fetching proposals:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (data || []).map((row) => mapRow(row as ProposalRow)),
      count: count || 0,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/proposals:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return handleCreate(TABLE, body, request);
}
