import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleCreate, mapKeysToCamel } from "@/lib/api-helpers";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

const TABLE = "tours";

/**
 * `bookings` is not a column - it is an aggregate of bookings.tour_id.
 * Returning the embedded count keeps the admin card's booking number real
 * instead of a hardcoded 0.
 */
const SELECT_WITH_BOOKINGS = "*, bookings(count)";

type TourRow = Record<string, unknown> & {
  bookings?: { count?: number }[] | null;
};

function mapRow(item: TourRow) {
  return {
    ...mapKeysToCamel(item),
    bookings: item.bookings?.[0]?.count ?? 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Same guard handleGetList("tours") applied via TABLE_AUTH.
    await requireAdmin({ module: "tours", minRole: "editor" });
    const supabase = createAdminClient();

    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    let query = supabase
      .from(TABLE)
      .select(SELECT_WITH_BOOKINGS, { count: "exact" })
      .order("title", { ascending: true });

    if (limit) query = query.limit(limit);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching tours:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (data || []).map((row) => mapRow(row as TourRow)),
      count: count || 0,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/tours:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // tours.slug is NOT NULL with no default; the admin form has no slug input.
  // Generate one from the title (same pattern as destinations/packages).
  if (!body.slug && typeof body.title === "string" && body.title.trim()) {
    body.slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  return handleCreate(TABLE, body, request);
}
