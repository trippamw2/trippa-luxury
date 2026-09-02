import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAllCustomerIntelligence } from "@/lib/ai/customer-intelligence";

/**
 * GET /api/admin/customer-intelligence
 * Returns lightweight intelligence summary for all customers +
 * aggregate platform summary. Powers the CRM dashboard.
 */
export async function GET(_request: NextRequest) {
  try {
    await requireAdmin({ module: "guest-profiles", minRole: "agent" });

    const result = await getAllCustomerIntelligence();

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof Error && "status" in error
      ? (error as { status?: number }).status ?? 500
      : 500;

    if (status === 401 || status === 403) {
      return NextResponse.json({ error: message }, { status });
    }

    console.error("Customer intelligence list error:", error);
    return NextResponse.json({ error: "Failed to load customer intelligence" }, { status: 500 });
  }
}
