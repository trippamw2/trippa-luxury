import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { marketingEngine, type Channel } from "@/lib/ai/marketing-engine";

/**
 * POST /api/admin/marketing/intelligence
 * Generate a cross-channel campaign (brand-consistent, romance-toned).
 * Body: { audience: string; destination?: string; channels: Channel[]; season?: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin({ module: "marketing", minRole: "editor" });
    const body = await request.json();
    if (!body?.audience || !Array.isArray(body?.channels)) {
      return NextResponse.json({ error: "Missing audience, channels[]" }, { status: 400 });
    }
    const campaign = await marketingEngine.generateCampaign({
      audience: body.audience,
      destination: body.destination,
      channels: body.channels as Channel[],
      season: body.season,
    });
    return NextResponse.json({ campaign });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
