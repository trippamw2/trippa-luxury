import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { financeEconomics } from "@/lib/ai/finance-economics";

/**
 * GET /api/admin/finance-intelligence
 * Unit-economics summary + margin ledger across the platform.
 * Query: ?view=margin for the margin ledger
 */
export async function GET(request: Request) {
  try {
    await requireAdmin({ module: "finance", minRole: "editor" });
    const url = new URL(request.url);
    const view = url.searchParams.get("view");

    const summary = await financeEconomics.summarize();
    if (view === "margin") {
      const ledger = await financeEconomics.marginLedger();
      return NextResponse.json({ summary, ledger });
    }
    return NextResponse.json({ summary });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
