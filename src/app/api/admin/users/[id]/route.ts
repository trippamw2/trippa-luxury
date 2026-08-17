import { NextRequest, NextResponse } from "next/server";
import { handleGetOne, handleUpdate } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";

const TABLE = "admin_profiles";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetOne(TABLE, id);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return handleUpdate(TABLE, id, body, request);
}

/**
 * Deletes an admin profile AND the underlying Supabase auth user.
 * Blocks an admin from deleting their own account.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await requireAdmin({ module: "users", minRole: "admin" });

    if (id === auth.profile.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch old data before deleting (for audit trail)
    const { data: oldData } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await supabase.from(TABLE).delete().eq("id", id);

    if (error) {
      console.error(`Error deleting ${TABLE}/${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also remove the underlying auth user so the account cannot sign in.
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
    if (authDeleteError) {
      console.error(`admin_profiles row deleted but auth user ${id} could not be removed:`, authDeleteError);
    }

    // Audit log
    createAuditLog({
      tableName: TABLE,
      recordId: id,
      action: "DELETE",
      oldData: sanitizeForAudit(oldData),
      performedBy: auth.profile.id,
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
