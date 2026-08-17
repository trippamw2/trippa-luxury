import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lightweight list of active staff members (id + name + role).
 * Used for assigning inquiries/bookings/tasks to a concierge.
 * Any active staff member may read this — assignment targets are not
 * sensitive, and the full user-management table stays admin-only.
 */
export async function GET() {
  try {
    await requireAdmin({ minRole: "agent" });
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("admin_profiles")
      .select("id, full_name, role")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error fetching staff list:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (data || []).map((member) => ({
        id: member.id,
        name: member.full_name || "Unnamed",
        role: member.role,
      })),
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/staff:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
