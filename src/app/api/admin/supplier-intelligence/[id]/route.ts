import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { supplierIntelligence, recordSupplierPerformance } from "@/lib/ai/supplier-intelligence";

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

/**
 * POST /api/admin/supplier-intelligence/[id]
 * Append the current appraisal to the immutable `supplier_performance` ledger.
 *
 * Deliberately a separate action rather than a side effect of GET. Two reasons,
 * and the second is the one that matters:
 *
 * 1. GET must be safe. Recording on read means a refresh, a prefetch or a retry
 *    each append a row, and the table is append-only, so those rows can never be
 *    retracted — the ledger fills with duplicates and stops being able to answer
 *    "how did this supplier score in March?".
 * 2. The row is labelled `observation_type = 'manual_review'`. That label is only
 *    true if a person actually reviewed the supplier. Writing it from an
 *    automatic read would put a false claim into an append-only record, which is
 *    worse than an empty ledger.
 *
 * The score itself remains agent-derived (`source: 'agent'`); this records that
 * a human chose to put that derivation on the record.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin({ module: "suppliers", minRole: "editor" });
    const { id } = await params;

    const scored = await supplierIntelligence.scoreSupplier(id);
    if (!scored) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    // recordSupplierPerformance never throws and reports a failed write as data,
    // so surface it rather than answering 200 and letting the caller believe the
    // appraisal was banked.
    const outcome = await recordSupplierPerformance(scored);

    if (!outcome.ok) {
      console.error(`Supplier performance ledger write failed for ${id}:`, outcome.error);
      return NextResponse.json(
        { error: outcome.error ?? "Failed to record the appraisal", recorded: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      recorded: outcome.action === "recorded",
      action: outcome.action,
      supplierId: scored.id,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
