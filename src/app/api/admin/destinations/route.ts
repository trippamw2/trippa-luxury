import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel } from "@/lib/api-helpers";

export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const grouped: Record<string, any[]> = {};
    for (const item of data || []) {
      const dest = item.destination || "other";
      if (!grouped[dest]) grouped[dest] = [];
      grouped[dest].push(mapKeysToCamel(item));
    }

    return NextResponse.json({
      data: Object.entries(grouped).map(([slug, properties]) => ({
        id: slug,
        slug,
        name: slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        properties,
        propertyCount: properties.length,
      })),
      count: Object.keys(grouped).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // Create a property under this destination
    const { data, error } = await supabase
      .from("properties")
      .insert({
        name: body.name,
        slug: body.slug || body.name?.toLowerCase().replace(/\s+/g, "-"),
        destination: body.slug || body.name?.toLowerCase().replace(/\s+/g, "-"),
        location: body.location || "",
        description: body.description || "",
        hero_image: body.heroImage || "",
        gallery: body.gallery || [],
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapKeysToCamel(data), { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
