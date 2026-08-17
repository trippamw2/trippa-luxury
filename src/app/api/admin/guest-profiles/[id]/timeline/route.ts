import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/guest-profiles/[id]/timeline
 * Returns the guest's communication history, linked bookings, and inquiries
 * in a single payload for the 360° profile slide-over.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireAdmin({ module: "guest-profiles", minRole: "agent" });
    const supabase = createAdminClient();

    // 1. Communications (newest first)
    const { data: communications, error: commError } = await supabase
      .from("guest_communications")
      .select("id, channel, direction, subject, body, related_booking_id, related_inquiry_id, admin_id, created_at")
      .eq("guest_profile_id", id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (commError) {
      return NextResponse.json({ error: commError.message }, { status: 500 });
    }

    // 2. Linked bookings (newest first)
    const { data: bookings, error: bookingError } = await supabase
      .from("bookings")
      .select("id, booking_reference, status, destination, start_date, end_date, total_amount, currency, created_at")
      .eq("guest_profile_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    // 3. Linked inquiries (newest first)
    const { data: inquiries, error: inquiryError } = await supabase
      .from("inquiries")
      .select("id, full_name, email, destination, status, message, created_at, converted_to_booking_id")
      .eq("guest_profile_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (inquiryError) {
      return NextResponse.json({ error: inquiryError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        communications: communications ?? [],
        bookings: bookings ?? [],
        inquiries: inquiries ?? [],
      },
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in GET /api/admin/guest-profiles/${id}/timeline:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
