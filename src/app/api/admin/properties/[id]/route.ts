import { NextRequest, NextResponse } from "next/server";
import { handleGetOne, handleUpdate, handleDelete } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

const TABLE = "properties";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetOne(TABLE, id);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return handleUpdate(TABLE, id, body, request);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  // Nightly rate editor: upsert/delete property_pricing row.
  if (Object.prototype.hasOwnProperty.call(body, "nightly_rate")) {
    try {
      await requireAdmin({ module: "properties", minRole: "editor" });
    } catch (err) {
      if (err instanceof AdminAuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }
    const supabase = createAdminClient();
    const value = body.nightly_rate;
    if (value === null || value === undefined || value === "") {
      await supabase.from("property_pricing").delete().eq("property_id", id);
    } else {
      const rate = Number(value);
      if (!Number.isFinite(rate) || rate < 0) {
        return NextResponse.json({ error: "nightly_rate must be a non-negative number" }, { status: 400 });
      }
      await supabase
        .from("property_pricing")
        .upsert({ property_id: id, base_rate: rate }, { onConflict: "property_id" });
    }
  }

  // Forward the rest of the payload to the generic update (if any other fields).
  const { nightly_rate: _nightly_rate, ...rest } = body;
  if (Object.keys(rest).length > 0) {
    return handleUpdate(TABLE, id, rest, request);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleDelete(TABLE, id);
}
