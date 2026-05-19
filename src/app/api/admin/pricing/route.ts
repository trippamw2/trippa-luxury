import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel, mapKeysToSnake } from "@/lib/api-helpers";

export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const { data: properties } = await supabase
      .from("properties")
      .select("id, name, price_range")
      .order("name");

    const { data: pricingRows } = await supabase
      .from("property_pricing")
      .select("*");

    const pricingMap = new Map((pricingRows || []).map((p: any) => [p.property_id, p]));

    const data = (properties || []).map((prop: any) => {
      const pricing = pricingMap.get(prop.id);
      const baseRate = parseFloat(prop.price_range?.replace(/[^0-9.]/g, "") || "500");
      return {
        id: pricing?.id || prop.id,
        propertyId: prop.id,
        propertyName: prop.name,
        currentRate: prop.price_range || "$500/night",
        baseRate: pricing?.base_rate || baseRate,
        peakSurcharge: pricing?.peak_surcharge || 25,
        lowSeasonDiscount: pricing?.low_season_discount || 20,
        smartPrice: pricing?.smart_price || null,
        currency: pricing?.currency || "USD",
      };
    });

    return NextResponse.json({ data, count: data.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("property_pricing")
      .insert(mapKeysToSnake(body))
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(mapKeysToCamel(data), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
