import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generateDailyBriefing } from "@/lib/ai/chief-of-staff";

/**
 * GET /api/admin/chief-of-staff/daily-briefing
 * Returns the executive daily briefing: top priorities, important customers,
 * high-value leads, pending decisions, bottlenecks, risks, and opportunities,
 * along with founder-level routing recommendations.
 */
export async function GET(_request: NextRequest) {
  try {
    await requireAdmin({ module: "dashboard", minRole: "agent" });

    const briefing = await generateDailyBriefing();

    return NextResponse.json(briefing, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof Error && "status" in error
      ? (error as { status?: number }).status ?? 500
      : 500;

    if (status === 401 || status === 403) {
      return NextResponse.json({ error: message }, { status });
    }

    console.error("Daily briefing error:", error);
    return NextResponse.json({ error: "Failed to generate daily briefing" }, { status: 500 });
  }
}
