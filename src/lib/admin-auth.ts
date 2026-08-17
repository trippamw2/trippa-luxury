import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ROLE_LEVEL,
  MODULE_MIN_ROLE,
  resolveEffectiveRole,
  type AdminRole,
} from "@/lib/admin-permissions";

export { resolveEffectiveRole, type AdminRole, type ModulePermission } from "@/lib/admin-permissions";

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

/** Module keys map to admin UI sections (e.g. "finance", "users", "bookings"). */
export type AdminAuthOptions = {
  /** Module key for per-module permission resolution, e.g. "finance". */
  module?: string;
  /** Minimum effective role required. Defaults to the module default (or "editor"). */
  minRole?: AdminRole;
};

export type AdminProfile = {
  id: string;
  role: AdminRole;
  /** Role after per-module permission overrides are applied. */
  effectiveRole: AdminRole;
  /** Raw per-module overrides from admin_profiles.permissions. */
  permissions: Record<string, unknown> | null;
};

/**
 * Verifies the current request is from an authenticated, active staff member.
 * Must be called within a Route Handler or Server Component.
 *
 * Uses the Supabase server client (cookie-based session) to check:
 *   1. A valid session exists
 *   2. The user has an admin_profiles entry that is active
 *   3. The user's effective role (base role + per-module overrides) is at
 *      least the required minimum for the requested module
 *
 * The admin_profiles query uses the service-role client to bypass the
 * recursive RLS policy on admin_profiles (which self-references and
 * triggers "infinite recursion detected in policy for relation").
 *
 * Throws AdminAuthError (401/403) if unauthorized.
 * Returns the session and profile on success.
 */
export async function requireAdmin(options: AdminAuthOptions = {}) {
  const { module, minRole } = options;
  const supabase = await createClient();

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    throw new AdminAuthError("Unauthorized : no valid session");
  }

  // Use service-role client to bypass the self-referencing RLS policy
  // on admin_profiles which causes infinite recursion.
  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("admin_profiles")
    .select("role, permissions, is_active")
    .eq("id", sessionData.session.user.id)
    .single();

  if (profileError || !profile) {
    throw new AdminAuthError("Forbidden : not an admin user", 403);
  }

  if (profile.is_active === false) {
    throw new AdminAuthError("Forbidden : account disabled", 403);
  }

  const baseRole: AdminRole = profile.role === "agent" || profile.role === "editor" || profile.role === "admin"
    ? profile.role
    : "editor";

  const effectiveRole = resolveEffectiveRole(baseRole, module, profile.permissions);

  if (effectiveRole === "denied") {
    throw new AdminAuthError("Forbidden : access to this module is denied", 403);
  }

  const required: AdminRole = minRole ?? (module ? MODULE_MIN_ROLE[module] ?? "editor" : "editor");

  if (ROLE_LEVEL[effectiveRole] < ROLE_LEVEL[required]) {
    throw new AdminAuthError(`Forbidden : requires ${required} access to this module`, 403);
  }

  return {
    session: sessionData.session,
    profile: {
      id: sessionData.session.user.id,
      role: baseRole,
      effectiveRole,
      permissions: profile.permissions,
    } satisfies AdminProfile,
  };
}
