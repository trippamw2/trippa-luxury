import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel } from "@/lib/api-helpers";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

type DestMeta = {
  name?: string;
  subtitle?: string;
  tagline?: string;
  description?: string;
  positioning?: string;
  heroImage?: string;
  gallery?: unknown[];
  experiences?: unknown[];
  highlights?: unknown[];
  seasons?: unknown[];
  isFeatured?: boolean;
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = createAdminClient();

    const [propertiesRes, destRes] = await Promise.all([
      supabase.from("properties").select("*").eq("destination", id).order("name"),
      supabase.from("destinations").select("*").eq("slug", id).single(),
    ]);

    if (propertiesRes.error) {
      return NextResponse.json({ error: propertiesRes.error.message }, { status: 500 });
    }

    const meta = destRes.data ? mapKeysToCamel<DestMeta>(destRes.data) : {};

    return NextResponse.json({
      id,
      slug: id,
      name: meta.name || id.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
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
      properties: mapKeysToCamel(propertiesRes.data || []),
      propertyCount: propertiesRes.data?.length || 0,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.subtitle !== undefined) updateData.subtitle = body.subtitle;
    if (body.tagline !== undefined) updateData.tagline = body.tagline;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.positioning !== undefined) updateData.positioning = body.positioning;
    if (body.heroImage !== undefined) updateData.hero_image = body.heroImage;
    if (body.gallery !== undefined) updateData.gallery = body.gallery;
    if (body.experiences !== undefined) updateData.experiences = body.experiences;
    if (body.highlights !== undefined) updateData.highlights = body.highlights;
    if (body.seasons !== undefined) updateData.seasons = body.seasons;
    if (body.isFeatured !== undefined) updateData.is_featured = body.isFeatured;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("destinations")
        .update(updateData)
        .eq("slug", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = createAdminClient();

    const { count } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("destination", id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot delete destination "${id}": ${count} properties still reference it. Remove or reassign properties first.` },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("destinations")
      .delete()
      .eq("slug", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
