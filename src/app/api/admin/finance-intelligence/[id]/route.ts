import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { financeEconomics } from "@/lib/ai/finance-economics";

/**
 * GET /api/admin/finance-intelligence/[id]
 * Detailed unit-economics for a single booking.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin({ module: "finance", minRole: "editor" });
    const { id } = await params;
    const booking = await financeEconomics.bookingEconomics(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ booking });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
