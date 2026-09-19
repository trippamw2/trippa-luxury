import { NextRequest, NextResponse } from "next/server";
import { calculatePricing, validatePricing, type PricingRules } from "@/lib/pricing-engine";

export async function POST(request: NextRequest) {
  try {
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
    const message = err instanceof Error ? err.message : "Pricing calculation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
