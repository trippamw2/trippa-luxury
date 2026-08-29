import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { supplierIntelligence } from "@/lib/ai/supplier-intelligence";

/**
 * GET /api/admin/supplier-intelligence
 * Score all suppliers for luxury/romance fit across the supply chain.
 */
export async function GET() {
  try {
    await requireAdmin({ module: "suppliers", minRole: "editor" });
    const scored = await supplierIntelligence.scoreAllSuppliers();
    return NextResponse.json({ suppliers: scored });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
