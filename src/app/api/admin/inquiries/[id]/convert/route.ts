import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";

const TABLE = "inquiries";

async function nextBookingReference(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const { count } = await supabase.from("bookings").select("id", { count: "exact", head: true });
  const seq = Math.max((count ?? 0) + 1, 1000);
  return `TRP-${seq.toString().padStart(4, "0")}`;
}

/**
 * Converts a qualified inquiry into a guest profile + provisional booking:
 *   1. Finds (or creates) the guest profile by email.
 *   2. Creates a provisional booking linked to the inquiry and guest.
 *   3. Marks the inquiry as booked with the booking reference.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await requireAdmin({ module: "inquiries", minRole: "agent" });
    const supabase = createAdminClient();

    // ── Load the inquiry ─────────────────────────────────────────────
    const { data: inquiry, error: inquiryError } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (inquiryError || !inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    if (inquiry.converted_to_booking_id) {
      return NextResponse.json(
        { error: "This inquiry has already been converted", bookingId: inquiry.converted_to_booking_id },
        { status: 409 }
      );
    }

    if (!inquiry.email) {
      return NextResponse.json({ error: "Inquiry has no email address" }, { status: 400 });
    }

    // ── 1. Find or create the guest profile ──────────────────────────
    const { data: existingGuest } = await supabase
      .from("guest_profiles")
      .select("*")
      .eq("email", inquiry.email)
      .maybeSingle();

    let guestId = existingGuest?.id ?? null;

    if (!guestId) {
      const { data: createdGuest, error: guestError } = await supabase
        .from("guest_profiles")
        .insert({
          full_name: inquiry.full_name,
          email: inquiry.email,
          phone: inquiry.phone || null,
          source: inquiry.source || "website",
          notes: inquiry.message ? `From inquiry: ${inquiry.message}`.slice(0, 500) : null,
        })
        .select("id")
        .single();

      if (guestError) {
        console.error("Failed to create guest profile during conversion:", guestError);
        return NextResponse.json({ error: guestError.message }, { status: 500 });
      }
      guestId = createdGuest.id;
    } else {
      // Keep the guest profile warm: remember this destination in wishlist history.
      const destinations = Array.isArray(existingGuest.past_destinations) ? existingGuest.past_destinations : [];
      if (inquiry.destination && !destinations.includes(inquiry.destination)) {
        await supabase
          .from("guest_profiles")
          .update({ past_destinations: [...destinations, inquiry.destination] })
          .eq("id", guestId);
      }
    }

    // ── 2. Create the provisional booking ────────────────────────────
    const reference = await nextBookingReference(supabase);

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_reference: reference,
        inquiry_id: id,
        guest_profile_id: guestId,
        status: "provisional",
        client_name: inquiry.full_name,
        client_email: inquiry.email,
        client_phone: inquiry.phone || null,
        destination: inquiry.destination || null,
        guests_count: inquiry.guests ?? 2,
        source: inquiry.source || "website",
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Failed to create booking during conversion:", bookingError);
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    // ── 3. Mark the inquiry as booked ────────────────────────────────
    const { error: inquiryUpdateError } = await supabase
      .from(TABLE)
      .update({
        status: "booked",
        guest_profile_id: guestId,
        converted_to_booking_id: booking.id,
      })
      .eq("id", id);

    if (inquiryUpdateError) {
      console.error("Booking created but inquiry conversion marker failed:", inquiryUpdateError);
    }

    // Log the conversion on the guest timeline
    if (guestId) {
      await supabase.from("guest_communications").insert({
        guest_profile_id: guestId,
        channel: "note",
        direction: "outbound",
        subject: `Inquiry converted to booking ${reference}`,
        body: `Converted from inquiry for ${inquiry.destination || "an undefined destination"}.`,
        related_inquiry_id: id,
        related_booking_id: booking.id,
        admin_id: auth.profile.id,
      });
    }

    // Audit log
    createAuditLog({
      tableName: "bookings",
      recordId: booking.id,
      action: "CREATE",
      newData: sanitizeForAudit(booking),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json(
      {
        success: true,
        bookingId: booking.id,
        bookingReference: booking.booking_reference,
        guestId,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in POST /api/admin/inquiries/${id}/convert:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
