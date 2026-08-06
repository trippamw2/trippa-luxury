import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel, mapKeysToSnake } from "@/lib/api-helpers";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

const TABLE = "expenses";
const SELECT_WITH_CATEGORY = "*, expense_categories!left(name, slug)";

type ExpenseRow = Record<string, unknown> & {
  expense_categories?: { name?: string; slug?: string } | null;
};

function mapRow(item: ExpenseRow) {
  const mapped = mapKeysToCamel(item);
  return {
    ...mapped,
    category: item.expense_categories?.name || "Other",
    categorySlug: item.expense_categories?.slug || "other",
  };
}

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error, count } = await supabase
      .from(TABLE)
      .select(SELECT_WITH_CATEGORY, { count: "exact" })
      .order("expense_date", { ascending: false });

    if (error) {
      console.error("Error fetching expenses:", error);
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
    console.error("Error in GET /api/admin/finance/expenses:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
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

    const { data, error } = await supabase
      .from(TABLE)
      .insert(dbData)
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) {
      console.error("Error creating expense:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapRow(data), { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in POST /api/admin/finance/expenses:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
