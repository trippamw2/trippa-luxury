import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { platformIntelligence } from "@/lib/ai/platform-intelligence";

/**
 * GET /api/admin/platform-intelligence
 * CEO/system-kernel health report aggregating every AI agent's contribution.
 */
export async function GET() {
  try {
    await requireAdmin({ module: "analytics", minRole: "editor" });
    const health = await platformIntelligence.health();
    return NextResponse.json({ health });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
