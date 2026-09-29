import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleCreate, joinSingle, mapKeysToCamel } from "@/lib/api-helpers";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

const TABLE = "itinerary_items";

/**
 * `itinerary_items` stores day-level rows and has no client column. The admin UI
 * shows a client name, so it is resolved through journey -> lead. It also has no
 * start/end date columns: a row carries a single `date` for its `itinerary_day`.
 */
const SELECT_WITH_RELATIONS =
  "id, journey_id, itinerary_day, date, start_time, end_time, location, destination, region, category, title, description, cost, selling_price, currency, booking_status, confirmation_number, created_at, updated_at, journeys(journey_name, lead_id, leads(full_name))";

type ItineraryRow = Record<string, unknown> & {
  journeys?: {
    journey_name?: string;
    lead_id?: string | null;
    leads?: { full_name?: string } | null;
  } | null;
};

function mapRow(item: ItineraryRow) {
  const journey = joinSingle(item.journeys);
  return {
    ...mapKeysToCamel(item),
    clientName: joinSingle(journey?.leads)?.full_name ?? null,
    journeyName: journey?.journey_name ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Same guard handleGetList("itinerary_items") applied via TABLE_AUTH.
    await requireAdmin({ module: "itinerary", minRole: "editor" });
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
      console.error("Error fetching itinerary items:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (data || []).map((row) => mapRow(row as ItineraryRow)),
      count: count || 0,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/itinerary:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * NOTE: the admin create form posts title/client_name/destination/start_date/
 * end_date, but itinerary_items requires journey_id, itinerary_day and date
 * (all NOT NULL) and stores no client/date-range columns. Creating a row from
 * that form therefore cannot succeed without a journey to attach it to - this
 * is a modelling gap, not a mapping bug, so POST is left unchanged rather than
 * silently inventing a journey.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return handleCreate(TABLE, body, request);
}
