import { createClient } from "@/lib/supabase/server";

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
 * Throws AdminAuthError (401/403) if unauthorized.
 * Returns the session and profile on success.
 */
export async function requireAdmin() {
  const supabase = await createClient();

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    throw new AdminAuthError("Unauthorized — no valid session");
  }

  const { data: profile, error: profileError } = await supabase
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
