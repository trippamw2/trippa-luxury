import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/guest/bookings
 * Returns all bookings for the authenticated guest (matched by email).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    // Verify the token with the Auth server; a cookie-decoded session is not
    // proof the guest still holds a valid, unrevoked token.
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const guestEmail = user.email.toLowerCase();

    const admin = createAdminClient();
    const { data: bookings, error } = await admin
      .from("bookings")
      .select("id, booking_reference, client_name, client_email, destination, start_date, end_date, guests_count, total_amount, balance_amount, currency, status")
      .ilike("client_email", guestEmail)
      .order("start_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (bookings || []).map((b) => ({
      id: b.id,
      ref: b.booking_reference || `TRP-${String(b.id || "").slice(0, 4).toUpperCase()}`,
      destination: b.destination || "",
      startDate: b.start_date || "",
      endDate: b.end_date || "",
      guests: b.guests_count || 2,
      totalAmount: b.total_amount || 0,
      balanceAmount: b.balance_amount || 0,
      currency: b.currency || "USD",
      status: b.status || "provisional",
    }));

    return NextResponse.json({ bookings: formatted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
