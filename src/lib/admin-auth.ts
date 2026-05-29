import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

/**
 * Verifies the current request is from an authenticated admin or editor.
 * Must be called within a Route Handler or Server Component.
 *
 * Uses the Supabase server client (cookie-based session) to check:
 * 1. A valid session exists
 * 2. The user has an admin_profiles entry with role "admin" or "editor"
 *
 * The admin_profiles query uses the service-role client to bypass the
 * recursive RLS policy on admin_profiles (which self-references and
 * triggers "infinite recursion detected in policy for relation").
 *
 * Throws AdminAuthError (401/403) if unauthorized.
 * Returns the session and profile on success.
 */
export async function requireAdmin() {
  const supabase = await createClient();

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    throw new AdminAuthError("Unauthorized — no valid session");
  }

  // Use service-role client to bypass the self-referencing RLS policy
  // on admin_profiles which causes infinite recursion.
  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("admin_profiles")
    .select("role")
    .eq("id", sessionData.session.user.id)
    .single();

  if (profileError || !profile) {
    throw new AdminAuthError("Forbidden — not an admin user", 403);
  }

  if (!["admin", "editor"].includes(profile.role)) {
    throw new AdminAuthError("Forbidden — insufficient role permissions", 403);
  }

  return {
    session: sessionData.session,
    profile: { id: sessionData.session.user.id, role: profile.role },
  };
}
