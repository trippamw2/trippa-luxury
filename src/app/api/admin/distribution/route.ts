import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { distributionEngine, type ChannelPerformance } from "@/lib/ai/distribution-engine";

/**
 * POST /api/admin/distribution
 * Plan channel mix for a campaign (allocation weights + rationale).
 * Body: { channels: string[]; audience: "discovery"|"nurture"|"re-engagement"; performance?: ChannelPerformance[] }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin({ module: "marketing", minRole: "editor" });
    const body = await request.json();
    if (!Array.isArray(body?.channels) || !body?.audience) {
      return NextResponse.json({ error: "Missing channels[], audience" }, { status: 400 });
    }
    const plan = await distributionEngine.plan({
      channels: body.channels,
      audience: body.audience,
      performance: body.performance as ChannelPerformance[] | undefined,
    });
    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
