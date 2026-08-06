import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel, mapKeysToSnake } from "@/lib/api-helpers";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

const TABLE = "suppliers";

const SELECT_WITH_CATEGORY = "*, supplier_categories!left(slug, name)";

type SupplierRow = Record<string, unknown> & {
  supplier_categories?: { slug?: string; name?: string } | null;
};

function mapRow(item: SupplierRow) {
  const mapped = mapKeysToCamel(item);
  return {
    ...mapped,
    category: item.supplier_categories?.slug || "lodge",
  };
}

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error, count } = await supabase
      .from(TABLE)
      .select(SELECT_WITH_CATEGORY, { count: "exact" })
      .order("name");

    if (error) {
      console.error("Error fetching suppliers:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (data || []).map(mapRow),
      count: count || 0,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/suppliers:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const supabase = createAdminClient();

    // If category slug provided, look up the UUID
    if (body.category) {
      const { data: cat } = await supabase
        .from("supplier_categories")
        .select("id")
        .eq("slug", body.category)
        .single();
      if (cat) body.category_id = cat.id;
      delete body.category;
    }

    const dbData = mapKeysToSnake(body);

    const { data, error } = await supabase
      .from(TABLE)
      .insert(dbData)
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) {
      console.error("Error creating supplier:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapRow(data), { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in POST /api/admin/suppliers:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
