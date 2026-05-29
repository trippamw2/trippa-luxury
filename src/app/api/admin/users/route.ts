import { NextRequest, NextResponse } from "next/server";
import { handleGetList } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";
import { mapKeysToSnake, mapKeysToCamel } from "@/lib/api-helpers";

const TABLE = "admin_profiles";

export async function GET(request: NextRequest) {
  return handleGetList(TABLE, request, { orderBy: { column: "full_name", direction: "asc" } });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    const supabase = createAdminClient();
    const body = await request.json();

    const { password, ...profileFields } = body;

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password is required and must be at least 6 characters" },
        { status: 400 }
      );
    }

    // ── 1. Create Supabase Auth user ──────────────────────────────────
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // ── 2. Insert into admin_profiles ─────────────────────────────────
    const dbData = mapKeysToSnake({
      ...profileFields,
      id: authUser.user.id, // Link profile to auth user
    });

    const { data, error } = await supabase
      .from(TABLE)
      .insert(dbData)
      .select()
      .single();

    if (error) {
      // Rollback: delete the auth user we just created
      await supabase.auth.admin.deleteUser(authUser.user.id);
      console.error(`Error creating ${TABLE}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── 3. Audit log ─────────────────────────────────────────────────
    createAuditLog({
      tableName: TABLE,
      recordId: data?.id,
      action: "CREATE",
      newData: sanitizeForAudit(data),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json(mapKeysToCamel(data), { status: 201 });
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in POST /api/admin/${TABLE}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
