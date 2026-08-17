/**
 * Shared admin permission logic (isomorphic — safe for both server and client).
 * Mirrors the enforcement in src/lib/admin-auth.ts so the sidebar and API
 * routes agree on what each module requires.
 */

export type AdminRole = "admin" | "editor" | "agent";

/** Per-module permission override value: a role to grant, or false to deny. */
export type ModulePermission = AdminRole | false;

export const ROLE_LEVEL: Record<AdminRole, number> = { agent: 1, editor: 2, admin: 3 };

/**
 * Default minimum role per module.
 * Agents handle guest-facing operations; editors handle content and
 * operations; finance/users/settings stay admin-only.
 */
export const MODULE_MIN_ROLE: Record<string, AdminRole> = {
  dashboard: "agent",
  bookings: "agent",
  inquiries: "agent",
  "guest-profiles": "agent",
  tasks: "agent",
  properties: "editor",
  packages: "editor",
  journeys: "editor",
  experiences: "editor",
  destinations: "editor",
  tours: "editor",
  suppliers: "editor",
  blog: "editor",
  media: "editor",
  marketing: "editor",
  finance: "admin",
  users: "admin",
  settings: "admin",
  "audit-log": "admin",
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Resolve the effective role for a module:
 *   1. Start from the user's base `role`.
 *   2. If a `permissions` override exists for the module, use it
 *      (`false` = deny outright, a role string = grant that level).
 *   3. A missing override falls back to the base role.
 */
export function resolveEffectiveRole(
  baseRole: AdminRole,
  module: string | undefined,
  permissions: unknown
): AdminRole | "denied" {
  if (!module || !isRecord(permissions)) return baseRole;
  if (!(module in permissions)) return baseRole;
  const override = permissions[module];
  if (override === false) return "denied";
  if (typeof override === "string" && override in ROLE_LEVEL) {
    return override as AdminRole;
  }
  return baseRole;
}

/** True when the user's effective role for a module meets its minimum. */
export function isModuleAllowed(
  baseRole: AdminRole,
  permissions: unknown,
  module: string
): boolean {
  const effective = resolveEffectiveRole(baseRole, module, permissions);
  if (effective === "denied") return false;
  const required = MODULE_MIN_ROLE[module] ?? "editor";
  return ROLE_LEVEL[effective] >= ROLE_LEVEL[required];
}
