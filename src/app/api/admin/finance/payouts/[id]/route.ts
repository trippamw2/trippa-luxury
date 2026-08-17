import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";

const TABLE = "supplier_payouts";
const PAYOUT_STATUSES = ["scheduled", "processing", "paid", "failed", "cancelled"] as const;

/**
 * PUT    /api/admin/finance/payouts/[id] — update payout (status workflow, reference).
 * DELETE /api/admin/finance/payouts/[id] — remove a payout (only when not paid).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await requireAdmin({ module: "finance", minRole: "admin" });
    const supabase = createAdminClient();
    const body = await request.json();

    const { data: existing, error: fetchError } = await supabase.from(TABLE).select("*").eq("id", id).single();
    if (fetchError || !existing) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {};
    if (typeof body.status === "string") {
      if (!(PAYOUT_STATUSES as readonly string[]).includes(body.status)) {
        return NextResponse.json({ error: "Invalid payout status" }, { status: 400 });
      }
      update.status = body.status;
      if (body.status === "paid" && !existing.paid_date) {
        update.paid_date = new Date().toISOString();
      }
      if (body.status === "scheduled") {
        update.paid_date = null;
      }
    }
    if (typeof body.reference === "string") update.reference = body.reference.trim() || null;
    if (typeof body.method === "string") update.method = body.method.trim() || null;
    if (typeof body.notes === "string") update.notes = body.notes.trim() || null;
    if (typeof body.scheduledDate === "string") update.scheduled_date = body.scheduledDate || null;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const { data: updated, error } = await supabase.from(TABLE).update(update).eq("id", id).select().single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    createAuditLog({
      tableName: TABLE,
      recordId: id,
      action: "UPDATE",
      oldData: sanitizeForAudit(existing),
      newData: sanitizeForAudit(updated),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        status: updated.status,
        paidDate: updated.paid_date,
        scheduledDate: updated.scheduled_date,
        reference: updated.reference,
      },
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in PUT /api/admin/finance/payouts/${id}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await requireAdmin({ module: "finance", minRole: "admin" });
    const supabase = createAdminClient();

    const { data: existing } = await supabase.from(TABLE).select("status").eq("id", id).single();
    if (existing && existing.status === "paid") {
      return NextResponse.json({ error: "Paid payouts cannot be deleted — mark them cancelled instead" }, { status: 400 });
    }

    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    createAuditLog({
      tableName: TABLE,
      recordId: id,
      action: "DELETE",
      oldData: sanitizeForAudit(existing),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in DELETE /api/admin/finance/payouts/${id}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
