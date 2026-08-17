import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

/**
 * Returns the current staff member's profile (role + permission overrides).
 * Used by the admin UI to gate navigation and by AdminAuthGuard to verify
 * the session belongs to an active staff account. Any active staff member
 * (admin / editor / agent) may call this.
 */
export async function GET() {
  try {
    const auth = await requireAdmin({ minRole: "agent" });
    return NextResponse.json({
      id: auth.profile.id,
      role: auth.profile.role,
      effectiveRole: auth.profile.effectiveRole,
      permissions: auth.profile.permissions ?? {},
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/auth/me:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
