import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";
import { mapKeysToCamel } from "@/lib/api-helpers";

const TABLE = "partnerships";
const CATEGORIES = ["hotel", "dmc", "brand", "airline", "media", "other"] as const;
const STATUSES = ["prospect", "active", "paused", "declined"] as const;

/** PUT /api/admin/partnerships/[id] — update a partner record. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await requireAdmin({ module: "suppliers", minRole: "editor" });
    const body = await request.json();
    const supabase = createAdminClient();

    const { data: existing } = await supabase.from(TABLE).select("*").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.partnerName !== undefined) {
      const name = typeof body.partnerName === "string" ? body.partnerName.trim() : "";
      if (!name) return NextResponse.json({ error: "Partner name is required" }, { status: 400 });
      patch.partner_name = name;
    }
    if (body.category !== undefined) {
      if (!(CATEGORIES as readonly string[]).includes(body.category)) {
        return NextResponse.json({ error: "Unknown category" }, { status: 400 });
      }
      patch.category = body.category;
    }
    if (body.status !== undefined) {
      if (!(STATUSES as readonly string[]).includes(body.status)) {
        return NextResponse.json({ error: "Unknown status" }, { status: 400 });
      }
      patch.status = body.status;
    }
    if (body.fitScore !== undefined) {
      if (body.fitScore === null || body.fitScore === "") {
        patch.fit_score = null;
      } else {
        const score = Number(body.fitScore);
        if (!Number.isFinite(score) || score < 0 || score > 100) {
          return NextResponse.json({ error: "Fit score must be between 0 and 100" }, { status: 400 });
        }
        patch.fit_score = score;
      }
    }
    for (const [key, column] of [
      ["contactName", "contact_name"],
      ["contactEmail", "contact_email"],
      ["country", "country"],
      ["notes", "notes"],
      ["source", "source"],
    ] as const) {
      if (body[key] !== undefined) {
        patch[column] = typeof body[key] === "string" ? body[key].trim() || null : null;
      }
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "That partner already exists in this category" },
          { status: 409 }
        );
      }
      console.error(`Error updating ${TABLE}/${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await createAuditLog({
      tableName: TABLE,
      recordId: id,
      action: "UPDATE",
      oldData: sanitizeForAudit(existing),
      newData: sanitizeForAudit(data),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json(mapKeysToCamel(data));
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in PUT /api/admin/partnerships/${id}:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/partnerships/[id] */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await requireAdmin({ module: "suppliers", minRole: "admin" });
    const supabase = createAdminClient();

    const { data: existing } = await supabase.from(TABLE).select("*").eq("id", id).single();
    if (!existing) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) {
      console.error(`Error deleting ${TABLE}/${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await createAuditLog({
      tableName: TABLE,
      recordId: id,
      action: "DELETE",
      oldData: sanitizeForAudit(existing),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in DELETE /api/admin/partnerships/${id}:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
