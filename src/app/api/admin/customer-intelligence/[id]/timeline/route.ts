import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getCustomerTimeline } from "@/lib/ai/customer-intelligence";

/**
 * GET /api/admin/customer-intelligence/[id]/timeline
 * Returns a unified chronological timeline of all customer touchpoints
 * across inquiries, bookings, journeys, and communications.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin({ module: "guest-profiles", minRole: "agent" });

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing customer id" }, { status: 400 });
    }

    const timeline = await getCustomerTimeline(id);
    if (!timeline) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ timeline }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof Error && "status" in error
      ? (error as { status?: number }).status ?? 500
      : 500;

    if (status === 401 || status === 403) {
      return NextResponse.json({ error: message }, { status });
    }

    console.error("Customer timeline error:", error);
    return NextResponse.json({ error: "Failed to load customer timeline" }, { status: 500 });
  }
}
