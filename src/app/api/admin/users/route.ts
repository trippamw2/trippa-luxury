import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";
import { mapKeysToSnake, mapKeysToCamel } from "@/lib/api-helpers";

const TABLE = "admin_profiles";

/**
 * `admin_profiles` has no email column - emails live in auth.users, which
 * PostgREST does not expose. The admin UI shows each user's email, so it is
 * fetched server-side through the auth admin API and joined by id.
 */
async function fetchAuthEmails(supabase: ReturnType<typeof createAdminClient>) {
  const emailById = new Map<string, string>();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      console.error("auth.admin.listUsers failed:", error.message);
      break;
    }
    const users = data?.users ?? [];
    for (const user of users) {
      if (user.email) emailById.set(user.id, user.email);
    }
    if (users.length < 100) break;
    page += 1;
    if (page > 50) break; // safety valve
  }
  return emailById;
}

export async function GET(request: NextRequest) {
  try {
    // Same guard handleGetList("admin_profiles") applied via TABLE_AUTH.
    await requireAdmin({ module: "users", minRole: "admin" });
    const supabase = createAdminClient();

    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("full_name", { ascending: true });

    if (limit) query = query.limit(limit);

    const { data, error, count } = await query;

    if (error) {
      console.error(`Error fetching ${TABLE}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const emailById = await fetchAuthEmails(supabase);
    const rows = (data || []).map((row) => {
      const mapped = mapKeysToCamel<Record<string, unknown>>(row);
      return { ...mapped, email: emailById.get(row.id) ?? "" };
    });

    return NextResponse.json({ data: rows, count: count || 0 });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/users:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin({ module: "users", minRole: "admin" });
    const supabase = createAdminClient();
      const body = await request.json();

      // email/password belong to the auth user, NOT admin_profiles - sending
      // them to the profile insert fails with 42703 (column does not exist).
      const { password, email, ...profileFields } = body;

      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: "Password is required and must be at least 6 characters" },
          { status: 400 }
        );
      }
      if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }

      // ── Step 1. Create Supabase Auth user ────────────────────────────────
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
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
    await createAuditLog({
      tableName: TABLE,
      recordId: data?.id,
      action: "CREATE",
      newData: sanitizeForAudit(data),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

      // The profile row has no email column; the auth user does.
      return NextResponse.json(
        mapKeysToCamel({ ...data, email: authUser.user.email || "" }),
        { status: 201 },
      );
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in POST /api/admin/${TABLE}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
