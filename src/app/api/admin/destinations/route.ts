import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel } from "@/lib/api-helpers";

export async function GET(_request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const [propertiesRes, destinationsRes] = await Promise.all([
      supabase.from("properties").select("*").order("name"),
      supabase.from("destinations").select("*").order("sort_order"),
    ]);

    if (propertiesRes.error) {
      return NextResponse.json({ error: propertiesRes.error.message }, { status: 500 });
    }

    const destMeta = new Map((destinationsRes.data || []).map((d: any) => [d.slug, mapKeysToCamel(d)]));

    const grouped: Record<string, any[]> = {};
    for (const item of propertiesRes.data || []) {
      const dest = item.destination || "other";
      if (!grouped[dest]) grouped[dest] = [];
      grouped[dest].push(mapKeysToCamel(item));
    }

    const data = Object.entries(grouped).map(([slug, properties]) => {
      const meta: Record<string, any> = destMeta.get(slug) || {};
      return {
        id: slug,
        slug,
        name: meta.name || slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        subtitle: meta.subtitle || "",
        tagline: meta.tagline || "",
        description: meta.description || "",
        positioning: meta.positioning || "",
        heroImage: meta.heroImage || "",
        gallery: meta.gallery || [],
        experiences: meta.experiences || [],
        highlights: meta.highlights || [],
        seasons: meta.seasons || [],
        isFeatured: meta.isFeatured || false,
        properties,
        propertyCount: properties.length,
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

    const slug = body.slug || body.name?.toLowerCase().replace(/\s+/g, "-");
    const { error: destError } = await supabase
      .from("destinations")
      .insert({
        slug,
        name: body.name || slug,
        subtitle: body.subtitle || "",
        tagline: body.tagline || "",
        description: body.description || "",
        positioning: body.positioning || "",
        hero_image: body.heroImage || "",
        gallery: body.gallery || [],
        experiences: body.experiences || [],
        highlights: body.highlights || [],
        seasons: body.seasons || [],
        is_featured: body.isFeatured || false,
      });

    if (destError) {
      return NextResponse.json({ error: destError.message }, { status: 500 });
    }

    return NextResponse.json({ id: slug, slug, name: body.name }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
