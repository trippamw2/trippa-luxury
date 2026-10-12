import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerGuestFeedback } from "@/lib/pipeline/register";

/**
 * POST /api/guest/bookings/[id]/feedback
 * Records a completed trip's guest feedback on the event bus (the append-only
 * stream is the institutional memory; the rating and comment live in the event
 * payload, so no separate feedback table is needed). Only the authenticated
 * guest whose email matches the booking's client_email can submit, and only
 * for completed trips. The registration is non-fatal — a lost event write
 * never fails the guest's submission.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const guestEmail = session.user.email.toLowerCase();

    const admin = createAdminClient();
    const { data: booking, error } = await admin
      .from("bookings")
      .select("id, status")
      .eq("id", id)
      .ilike("client_email", guestEmail)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "completed") {
      return NextResponse.json(
        { error: "Feedback is only available for completed trips" },
        { status: 409 }
      );
    }

    const body = await request.json();
    const rating = Number(body.rating);
    const comment =
      typeof body.comment === "string" && body.comment.trim()
        ? String(body.comment).slice(0, 2000)
        : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be a whole number between 1 and 5" },
        { status: 400 }
      );
    }

    // Never throws; a failure here only surfaces in the response/logs.
    const result = await registerGuestFeedback(booking.id, { rating, comment });
    if (result.error) {
      console.error("Feedback registration issue:", result.error);
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      pipelineRegistered: result.registered,
      pipelineError: result.error,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}