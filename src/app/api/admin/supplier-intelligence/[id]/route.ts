import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { supplierIntelligence } from "@/lib/ai/supplier-intelligence";

/**
 * GET /api/admin/supplier-intelligence/[id]
 * Score a single supplier (optionally appraise with an LLM narrative).
 * Query: ?appraise=true
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin({ module: "suppliers", minRole: "editor" });
    const { id } = await params;
    const appraise = request.nextUrl.searchParams.get("appraise") === "true";

    const scored = await supplierIntelligence.scoreSupplier(id);
    if (!scored) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    let appraisal: { narrative: string; source: "llm" | "rules" } | undefined;
    if (appraise) {
      appraisal = await supplierIntelligence.appraise(scored);
    }

    return NextResponse.json({ supplier: scored, appraisal });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
