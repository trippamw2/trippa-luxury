import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { partnershipAgent, type PartnerCandidate } from "@/lib/ai/partnership-agent";

/**
 * POST /api/admin/partnerships
 * Score partner candidates for strategic fit (hotel, DMC, luxury-brand, etc.).
 * Body: { candidates: PartnerCandidate[] }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin({ module: "suppliers", minRole: "editor" });
    const body = await request.json();
    if (!Array.isArray(body?.candidates) || body.candidates.length === 0) {
      return NextResponse.json({ error: "Missing candidates[]" }, { status: 400 });
    }
    const scores = await partnershipAgent.evaluate(body.candidates as PartnerCandidate[]);
    return NextResponse.json({ scores });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
