// ─── Seed Admin Data ─────────────────────────────────────────────────────
// ONE-TIME seed: pushes all static constant data into Supabase tables.
// After seeding, the admin panel can edit the data that previously
// existed only in src/lib/constants.ts.
//
// Usage:  POST /api/admin/seed  (requires x-seed-key header)
//         GET  /api/admin/seed  (dry-run, returns count of items to seed)
//
// Security: Both GET and POST are gated by ADMIN_SEED_SECRET env var.
// Set ADMIN_SEED_SECRET to a random string, then pass it as
// the x-seed-key header. Without it, the endpoint returns 401.
// ─────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Auth guard ───────────────────────────────────────────────────────────
function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SEED_SECRET;
  // If no secret is configured, block all access
  if (!secret) return false;
  const provided = request.headers.get("x-seed-key");
  return provided === secret;
}

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Set ADMIN_SEED_SECRET env var and pass x-seed-key header." },
    { status: 401 }
  );
}
// ─────────────────────────────────────────────────────────────────────────
import {
  PROPERTIES as CONSTANT_PROPERTIES,
  DESTINATIONS as CONSTANT_DESTINATIONS,
  PACKAGES as CONSTANT_PACKAGES,
} from "@/lib/constants";

function mapPropertyToDb(p: any) {
  return {
    slug: p.id,
    name: p.name,
    destination: p.destination,
    location: p.location,
    tagline: p.tagline || "",
    description: p.description || "",
    long_description: p.longDescription || "",
    hero_image: p.heroImage || "",
    gallery: p.gallery || [],
    price_range: p.priceRange || "",
    room_types: p.roomTypes || [],
    amenities: p.amenities || [],
    rating: p.rating || 0,
    romantic_highlights: p.romanticHighlights || [],
    awards: p.awards || [],
    reviews: p.reviews || [],
    rooms: p.rooms || [],
    is_featured: p.isFeatured ?? false,
    is_active: p.isActive ?? true,
  };
}

function mapDestinationToDb(d: any) {
  return {
    slug: d.slug,
    name: d.title,
    subtitle: d.subtitle || "",
    tagline: d.tagline || "",
    description: d.description || "",
    positioning: d.positioning || "",
    hero_image: d.heroImage || "",
    gallery: d.gallery || [],
    experiences: d.experiences || [],
    highlights: d.highlights || [],
    seasons: d.seasons || {},
    is_featured: false,
  };
}

function mapPackageToDb(pkg: any) {
  return {
    slug: pkg.slug || pkg.id,
    title: pkg.title || pkg.name || "",
    subtitle: pkg.subtitle || "",
    description: pkg.description || "",
    duration: pkg.duration || "",
    price: pkg.price || "",
    destinations: pkg.destinations || [],
    properties: pkg.properties || [],
    inclusions: pkg.inclusions || [],
    itinerary: pkg.itinerary || [],
    is_active: pkg.isActive ?? true,
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();

  return NextResponse.json({
    properties: CONSTANT_PROPERTIES.length,
    destinations: CONSTANT_DESTINATIONS.length,
    packages: CONSTANT_PACKAGES.length,
    message: "Dry-run. POST to actually seed the data.",
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorized();

  try {
    const supabase = createAdminClient();
    const results: Record<string, any> = {};

    // ── 1. Seed destinations ─────────────────────────────────────────────
    const destRecords = CONSTANT_DESTINATIONS.map(mapDestinationToDb);
    const destSlugs = destRecords.map((d) => d.slug);

    await supabase.from("destinations").delete().in("slug", destSlugs);
    const { error: destError } = await supabase
      .from("destinations")
      .insert(destRecords)
      .select();

    if (destError) {
      results.destinations = { error: destError.message };
    } else {
      results.destinations = { inserted: destRecords.length };
    }

    // ── 2. Seed properties ───────────────────────────────────────────────
    const propRecords = CONSTANT_PROPERTIES.map(mapPropertyToDb);
    const propSlugs = propRecords.map((p: any) => p.slug);

    await supabase.from("properties").delete().in("slug", propSlugs);
    const { error: propError } = await supabase
      .from("properties")
      .insert(propRecords)
      .select();

    if (propError) {
      results.properties = { error: propError.message };
    } else {
      results.properties = { inserted: propRecords.length };
    }

    // ── 3. Seed packages ─────────────────────────────────────────────────
    const pkgRecords = CONSTANT_PACKAGES.map(mapPackageToDb);
    const pkgSlugs = pkgRecords.map((p: any) => p.slug);

    await supabase.from("packages").delete().in("slug", pkgSlugs);
    const { error: pkgError } = await supabase
      .from("packages")
      .insert(pkgRecords)
      .select();

    if (pkgError) {
      results.packages = { error: pkgError.message };
    } else {
      results.packages = { inserted: pkgRecords.length };
    }

    const hasError = results.destinations?.error || results.properties?.error || results.packages?.error;
    return NextResponse.json(
      { success: !hasError, results },
      { status: hasError ? 500 : 200 }
    );
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
