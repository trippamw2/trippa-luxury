import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generateWeeklyReview } from "@/lib/ai/chief-of-staff";

/**
 * GET /api/admin/chief-of-staff/weekly-review
 * Returns the weekly CEO review: what happened, what worked, what failed,
 * what to automate, what stays human, and the highest-leverage next action.
 */
export async function GET(_request: NextRequest) {
  try {
    await requireAdmin({ module: "dashboard", minRole: "agent" });

    const review = await generateWeeklyReview();

    return NextResponse.json(review, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof Error && "status" in error
      ? (error as { status?: number }).status ?? 500
      : 500;

    if (status === 401 || status === 403) {
      return NextResponse.json({ error: message }, { status });
    }

    console.error("Weekly review error:", error);
    return NextResponse.json({ error: "Failed to generate weekly review" }, { status: 500 });
  }
}
