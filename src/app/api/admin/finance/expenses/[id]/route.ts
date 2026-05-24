import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel, mapKeysToSnake } from "@/lib/api-helpers";

const TABLE = "expenses";
const SELECT_WITH_CATEGORY = "*, expense_categories!left(name, slug)";

function mapRow(item: any) {
  const mapped = mapKeysToCamel(item);
  return {
    ...mapped,
    category: item.expense_categories?.name || "Other",
    categorySlug: item.expense_categories?.slug || "other",
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let id: string;
  try { id = (await params).id; } catch { return NextResponse.json({ error: "Invalid id" }, { status: 400 }); }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select(SELECT_WITH_CATEGORY)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      console.error(`Error fetching ${TABLE}/${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapRow(data));
  } catch (err: any) {
    console.error(`Error in GET /api/admin/${TABLE}/${id}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let id: string;
  try { id = (await params).id; } catch { return NextResponse.json({ error: "Invalid id" }, { status: 400 }); }
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // If category name provided, look up the UUID
    if (body.category) {
      const { data: cat } = await supabase
        .from("expense_categories")
        .select("id")
        .eq("name", body.category)
        .single();
      if (cat) body.category_id = cat.id;
      delete body.category;
    }
    if (body.categorySlug) delete body.categorySlug;

    const dbData = mapKeysToSnake(body);
    delete dbData.id;

    const { data, error } = await supabase
      .from(TABLE)
      .update(dbData)
      .eq("id", id)
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) {
      console.error(`Error updating ${TABLE}/${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapRow(data));
  } catch (err: any) {
    console.error(`Error in PUT /api/admin/${TABLE}/${id}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let id: string;
  try { id = (await params).id; } catch { return NextResponse.json({ error: "Invalid id" }, { status: 400 }); }
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from(TABLE).delete().eq("id", id);

    if (error) {
      console.error(`Error deleting ${TABLE}/${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`Error in DELETE /api/admin/${TABLE}/${id}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
