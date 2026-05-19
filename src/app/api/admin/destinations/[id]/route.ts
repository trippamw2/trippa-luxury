import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapKeysToCamel } from "@/lib/api-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const [propertiesRes, destRes] = await Promise.all([
      supabase.from("properties").select("*").eq("destination", id).order("name"),
      supabase.from("destinations").select("*").eq("slug", id).single(),
    ]);

    if (propertiesRes.error) {
      return NextResponse.json({ error: propertiesRes.error.message }, { status: 500 });
    }

    const meta = destRes.data;

    return NextResponse.json({
      id,
      slug: id,
      name: meta?.name || id.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      description: meta?.description || null,
      heroImage: meta?.hero_image || null,
      highlights: meta?.highlights || [],
      seasons: meta?.seasons || [],
      isFeatured: meta?.is_featured || false,
      properties: mapKeysToCamel(propertiesRes.data || []),
      propertyCount: propertiesRes.data?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    // Update destination metadata
    const updateData: Record<string, any> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.heroImage !== undefined) updateData.hero_image = body.heroImage;
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Check if there are properties in this destination
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

    // Delete destination metadata only (no properties affected)
    const { error } = await supabase
      .from("destinations")
      .delete()
      .eq("slug", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
