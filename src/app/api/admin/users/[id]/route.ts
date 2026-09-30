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
  // The admin form always sends email, but admin_profiles has no email
  // column - handleUpdate would fail with 42703. Email changes are not
  // supported here, so drop it before the profile update.
  delete body.email;
  const res = await handleUpdate(TABLE, id, body, request);
  // admin_profiles has no email column, and the admin list replaces its row
  // with this response - re-attach the email from auth so it cannot blank out.
  if (!res.ok) return res;
  try {
    const json = await res.json();
    const supabase = createAdminClient();
    const { data: authData } = await supabase.auth.admin.getUserById(id);
    return NextResponse.json({ ...json, email: authData?.user?.email ?? "" }, { status: res.status });
  } catch (err) {
    console.error("Enriching admin profile update with email failed:", err);
    return res;
  }
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
    await createAuditLog({
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
