import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/guest/bookings/[id]
 * Returns a single booking for the authenticated guest.
 * Only returns the booking if the guest's email matches the booking's client_email.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const guestEmail = session.user.email.toLowerCase();

    const admin = createAdminClient();
    const { data: booking, error } = await admin
      .from("bookings")
      .select("*")
      .eq("id", id)
      .ilike("client_email", guestEmail)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        ref: booking.booking_reference || `TRP-${String(booking.id || "").slice(0, 4).toUpperCase()}`,
        destination: booking.destination || "",
        startDate: booking.start_date || "",
        endDate: booking.end_date || "",
        guests: booking.guests_count || 2,
        totalAmount: booking.total_amount || 0,
        depositAmount: booking.deposit_amount || 0,
        balanceAmount: booking.balance_amount || 0,
        currency: booking.currency || "USD",
        status: booking.status || "provisional",
        specialRequests: booking.special_requests || "",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
