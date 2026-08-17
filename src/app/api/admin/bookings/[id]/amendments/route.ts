import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";
import { joinSingle } from "@/lib/api-helpers";

/**
 * GET  /api/admin/bookings/[id]/amendments — amendment history for a booking.
 * POST /api/admin/bookings/[id]/amendments — record a manual amendment.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireAdmin({ module: "bookings", minRole: "agent" });
    const supabase = createAdminClient();

    const { data: amendments, error } = await supabase
      .from("booking_amendments")
      .select("id, field, old_value, new_value, reason, changed_by, created_at, admin_profiles(full_name)")
      .eq("booking_id", id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (amendments ?? []).map((a) => ({
        id: a.id,
        field: a.field,
        oldValue: a.old_value,
        newValue: a.new_value,
        reason: a.reason,
        changedByName: joinSingle(a.admin_profiles)?.full_name ?? null,
        createdAt: a.created_at,
      })),
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in GET /api/admin/bookings/${id}/amendments:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await requireAdmin({ module: "bookings", minRole: "agent" });
    const supabase = createAdminClient();
    const body = await request.json();

    const field = typeof body.field === "string" ? body.field.trim() : "";
    const oldValue = typeof body.oldValue === "string" ? body.oldValue.trim() : null;
    const newValue = typeof body.newValue === "string" ? body.newValue.trim() : null;
    const reason = typeof body.reason === "string" ? body.reason.trim() : null;

    if (!field || (newValue === null && oldValue === null)) {
      return NextResponse.json({ error: "Field and a value change are required" }, { status: 400 });
    }

    const { data: amendment, error } = await supabase
      .from("booking_amendments")
      .insert({
        booking_id: id,
        field,
        old_value: oldValue,
        new_value: newValue,
        reason,
        changed_by: auth.profile.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    createAuditLog({
      tableName: "booking_amendments",
      recordId: amendment.id,
      action: "CREATE",
      newData: sanitizeForAudit(amendment),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({
      data: {
        id: amendment.id,
        field: amendment.field,
        oldValue: amendment.old_value,
        newValue: amendment.new_value,
        reason: amendment.reason,
        createdAt: amendment.created_at,
      },
    }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in POST /api/admin/bookings/${id}/amendments:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
