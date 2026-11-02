import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, getIpFromRequest, sanitizeForAudit } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: feedbackId } = await params;
  try {
    const { profile } = await requireAdmin({ module: "analytics", minRole: "editor" });
    const body = await request.json();
    const quote = typeof body?.quote === "string" ? body.quote.trim() : "";
    if (!quote || quote.length > 500) {
      return NextResponse.json({ error: "quote is required (<=500 chars)" }, { status: 400 });
    }
    const guestName = typeof body?.guestName === "string" ? body.guestName.trim() : null;
    const tripSummary = typeof body?.tripSummary === "string" ? body.tripSummary.trim().slice(0, 200) : null;
    const rating = typeof body?.rating === "number" && body.rating >= 1 && body.rating <= 5 ? body.rating : null;

    const supabase = createAdminClient();

    // Feedback must exist.
    const { data: feedback, error: fbError } = await supabase
      .from("journey_feedback")
      .select("id, booking_id, guest_profile_id")
      .eq("id", feedbackId)
      .single();
    if (fbError || !feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // Guard: no existing published testimonial for this feedback.
    const { data: existing } = await supabase
      .from("testimonials")
      .select("id")
      .eq("source_feedback_id", feedbackId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Already published" }, { status: 409 });
    }

    // Resolve guest name from booking if not provided.
    let resolvedName = guestName;
    if (!resolvedName && feedback.booking_id) {
      const { data: booking } = await supabase
        .from("bookings")
        .select("client_name")
        .eq("id", feedback.booking_id)
        .maybeSingle();
      resolvedName = booking?.client_name ?? null;
    }
    if (!resolvedName) resolvedName = "Guest";

    const { data: inserted, error: insertError } = await supabase
      .from("testimonials")
      .insert({
        name: resolvedName,
        text: quote,
        rating: rating ?? 5,
        trip_summary: tripSummary,
        source_feedback_id: feedbackId,
        published: true,
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json({ error: insertError?.message || "Insert failed" }, { status: 500 });
    }

    await createAuditLog({
      tableName: "testimonials",
      action: "CREATE",
      recordId: inserted.id,
      newData: sanitizeForAudit({ source_feedback_id: feedbackId, quote, rating, published: true }),
      performedBy: profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({ id: inserted.id, published: true }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Feedback publish error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}