import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel, mapKeysToSnake } from "@/lib/api-helpers";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, getIpFromRequest, sanitizeForAudit } from "@/lib/audit";

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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let id: string;
  try { id = (await params).id; } catch { return NextResponse.json({ error: "Invalid id" }, { status: 400 }); }
  try {
    await requireAdmin({ module: "suppliers", minRole: "editor" });
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
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in GET /api/admin/${TABLE}/${id}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let id: string;
  try { id = (await params).id; } catch { return NextResponse.json({ error: "Invalid id" }, { status: 400 }); }
  try {
    const { profile } = await requireAdmin({ module: "suppliers", minRole: "editor" });
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
    delete dbData.id;

    const { data: oldRow } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();

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

    await createAuditLog({
      tableName: TABLE,
      recordId: id,
      action: "UPDATE",
      oldData: sanitizeForAudit(oldRow),
      newData: sanitizeForAudit(data),
      performedBy: profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json(mapRow(data));
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in PUT /api/admin/${TABLE}/${id}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let id: string;
  try { id = (await params).id; } catch { return NextResponse.json({ error: "Invalid id" }, { status: 400 }); }
  try {
    const { profile } = await requireAdmin({ module: "suppliers", minRole: "editor" });
    const supabase = createAdminClient();

    // Read before delete so the trail retains what was removed.
    const { data: doomed } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();

    const { error } = await supabase.from(TABLE).delete().eq("id", id);

    if (error) {
      console.error(`Error deleting ${TABLE}/${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await createAuditLog({
      tableName: TABLE,
      recordId: id,
      action: "DELETE",
      oldData: sanitizeForAudit(doomed),
      performedBy: profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in DELETE /api/admin/${TABLE}/${id}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
