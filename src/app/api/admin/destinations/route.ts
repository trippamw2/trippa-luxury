import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel } from "@/lib/api-helpers";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const [propertiesRes, destinationsRes] = await Promise.all([
      supabase.from("properties").select("*").order("name"),
      supabase.from("destinations").select("*").order("sort_order"),
    ]);

    if (propertiesRes.error) {
      return NextResponse.json({ error: propertiesRes.error.message }, { status: 500 });
    }

    const destMeta = new Map<string, Record<string, unknown>>(
      (destinationsRes.data || []).map((d: { slug: string }) =>
        [d.slug, mapKeysToCamel<Record<string, unknown>>(d)] as [string, Record<string, unknown>]
      )
    );

    const grouped: Record<string, unknown[]> = {};
    for (const item of propertiesRes.data || []) {
      const dest = item.destination || "other";
      if (!grouped[dest]) grouped[dest] = [];
      grouped[dest].push(mapKeysToCamel(item));
    }

    const data = Object.entries(grouped).map(([slug, properties]) => {
      const meta: Record<string, unknown> = destMeta.get(slug) ?? {};
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
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
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
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
