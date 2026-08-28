import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getCustomerIntelligence } from "@/lib/ai/customer-intelligence";

/**
 * GET /api/admin/customer-intelligence/[id]
 * Returns full intelligence context for a single customer.
 * This is the "single source of truth" an AI agent queries to
 * understand a customer before any interaction.
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

    const intelligence = await getCustomerIntelligence(id);
    if (!intelligence) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(intelligence, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = error instanceof Error && "status" in error
      ? (error as { status?: number }).status ?? 500
      : 500;

    if (status === 401 || status === 403) {
      return NextResponse.json({ error: message }, { status });
    }

    console.error("Customer intelligence error:", error);
    return NextResponse.json({ error: "Failed to load customer intelligence" }, { status: 500 });
  }
}
