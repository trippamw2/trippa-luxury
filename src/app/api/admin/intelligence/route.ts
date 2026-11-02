import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { marketIntelligence } from "@/lib/ai/market-intelligence";

/**
 * Admin Market Intelligence API.
 * GET  /api/admin/intelligence          → full market report (signals + opportunities)
 * GET  /api/admin/intelligence?scenario=peak|new_destination|downtime  → scenario plan
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin({ module: "analytics", minRole: "editor" });
    const scenario = request.nextUrl.searchParams.get("scenario");

    if (scenario) {
      const plan = await marketIntelligence.scenarioPlan(scenario);
      return NextResponse.json({ plan });
    }

    const report = await marketIntelligence.analyzeMarket();
    try {
      const { persistAgentReport } = await import("@/lib/ai/agent-persistence");
      await persistAgentReport({
        agent: "market-intelligence",
        scope: "commercial",
        title: "Market analysis",
        statement: "Market intelligence report generated.",
        report: (report ?? {}) as unknown as Record<string, unknown>,
      });
    } catch (persistErr) {
      console.error("Failed to persist market intelligence report:", persistErr);
    }
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
