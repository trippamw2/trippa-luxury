import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { generateBookingICal } from "@/lib/ical";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const supabase = createAdminClient();
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*, properties:property_id(name)")
      .eq("id", id)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const icsContent = generateBookingICal({
      id: booking.id,
      bookingReference: booking.booking_reference,
      clientName: booking.client_name || "Guest",
      clientEmail: booking.client_email,
      destination: booking.destination,
      propertyName: booking.properties?.name,
      startDate: booking.start_date,
      endDate: booking.end_date,
    });

    const ref = booking.booking_reference || booking.id.slice(0, 8).toUpperCase();

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="kivara-booking-${ref}.ics"`,
      },
    });
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("iCal generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
