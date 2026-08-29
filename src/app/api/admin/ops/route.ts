import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { opsOrchestrator } from "@/lib/ai/ops-orchestrator";

/**
 * POST /api/admin/ops
 * Plan the full operations for a booking (arrival → departure).
 * Body: { bookingId: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin({ module: "bookings", minRole: "editor" });
    const body = await request.json();
    if (!body?.bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }
    const plan = await opsOrchestrator.planBookingOperations(body.bookingId);
    if (!plan) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
