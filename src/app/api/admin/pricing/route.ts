import { NextRequest, NextResponse } from "next/server";
import { calculatePricing, validatePricing, type PricingRules } from "@/lib/pricing-engine";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

/**
 * POST /api/admin/pricing
 * Prices a journey from supplier cost.
 *
 * Guarded even though it touches no database: the response exposes the markup
 * and margin model, which is commercially sensitive. An unauthenticated caller
 * could otherwise map the pricing structure by probing.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin({ module: "finance", minRole: "agent" });

    const body = await request.json();
    const { supplier_cost, rules, options } = body as {
      supplier_cost: number;
      rules: PricingRules;
      options?: { pax?: number; rooms?: number; nights?: number; currency?: string };
    };

    if (typeof supplier_cost !== "number" || supplier_cost < 0) {
      return NextResponse.json({ error: "Valid supplier_cost is required" }, { status: 400 });
    }

    const result = calculatePricing(supplier_cost, rules, options);
    const validation = validatePricing(result);

    return NextResponse.json({
      ...result,
      validation,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Pricing calculation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
