import { NextRequest, NextResponse } from "next/server";
import { handleGetList, handleCreate, mapKeysToCamel } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

const TABLE = "saved_journeys";

export async function GET(request: NextRequest) {
  await requireAdmin({ module: "journeys", minRole: "editor" });
  const url = new URL(request.url);
  const search = url.searchParams.get("search");

  if (search) {
    // Support searching by guest name or email
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .or(`guest_name.ilike.%${search}%,guest_email.ilike.%${search}%`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error searching journeys:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: mapKeysToCamel(data || []),
      count: data?.length || 0,
    });
  }

  return handleGetList(TABLE, request, { orderBy: { column: "created_at", direction: "desc" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return handleCreate(TABLE, body);
}
