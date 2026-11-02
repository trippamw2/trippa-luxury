import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("testimonials")
      .select("id, name, text, location, rating, trip_summary, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(12);

    if (error) throw error;

    const rows = (data || []).map((t: { name: string; text: string; location: string | null; rating: number | null; trip_summary: string | null; published_at: string | null }) => ({
      name: t.name,
      text: t.text,
      location: t.location,
      rating: t.rating ?? 5,
      tripSummary: t.trip_summary,
      publishedAt: t.published_at,
    }));

    return NextResponse.json({ data: rows, count: rows.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}