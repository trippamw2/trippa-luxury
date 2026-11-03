import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin({ module: "analytics", minRole: "editor" });
    const supabase = createAdminClient();

    const status = request.nextUrl.searchParams.get("status");
    const publishedFilter = status === "published" ? true : status === "pending" ? false : null;

    const { data: feedback, error } = await supabase
      .from("journey_feedback")
      .select(
        "id, journey_id, booking_id, guest_profile_id, nps_score, sentiment, would_recommend, created_at, " +
          "booking:bookings(booking_reference, client_name, client_email), " +
          "guest:guest_profiles(full_name), " +
          "testimonial:testimonials(id, source_feedback_id, text, published, published_at)"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let rows = (feedback || []).map((f) => {
      const tf = f as unknown as Record<string, unknown>;
      const booking = tf.booking as Record<string, unknown> | null;
      const guest = tf.guest as Record<string, unknown> | null;
      const tRaw = tf.testimonial;
      const t = Array.isArray(tRaw) ? (tRaw[0] as Record<string, unknown> | undefined) : (tRaw as Record<string, unknown> | null);
      return {
        id: tf.id as string,
        journeyId: tf.journey_id as string | null,
        bookingId: tf.booking_id as string | null,
        bookingRef: (booking?.booking_reference as string) ?? null,
        clientName: (booking?.client_name as string) ?? (guest?.full_name as string) ?? null,
        npsScore: tf.nps_score as number | null,
        sentiment: tf.sentiment as string | null,
        wouldRecommend: tf.would_recommend as boolean | null,
        createdAt: tf.created_at as string,
        published: (t?.published as boolean) ?? false,
        testimonialId: (t?.id as string) ?? null,
        quote: (t?.text as string) ?? null,
        publishedAt: (t?.published_at as string) ?? null,
      };
    });

    if (publishedFilter !== null) {
      rows = rows.filter((r) => r.published === publishedFilter);
    }

    return NextResponse.json({ data: rows, count: rows.length });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Feedback list error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}