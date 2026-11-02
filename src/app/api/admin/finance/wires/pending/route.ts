import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin({ module: "finance", minRole: "agent" });
    const supabase = createAdminClient();

    // Pending wire payments first.
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("id, booking_id, amount, currency, status, reference, notes, created_at")
      .eq("payment_method", "wire_transfer")
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: true });

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    const bookingIds = Array.from(new Set((payments || []).map((p) => p.booking_id).filter(Boolean)));
    const bookingMap: Record<string, { booking_reference?: string | null; client_name?: string | null; client_email?: string | null; check_in?: string | null; check_out?: string | null }> = {};
    if (bookingIds.length > 0) {
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, booking_reference, client_name, client_email, check_in, check_out, total_amount, currency")
        .in("id", bookingIds);
      if (bookingsError) {
        return NextResponse.json({ error: bookingsError.message }, { status: 500 });
      }
      for (const b of bookings || []) bookingMap[b.id] = b;
    }

    const wires = (payments || []).map((p) => ({
      paymentId: p.id,
      bookingId: p.booking_id,
      bookingRef: bookingMap[p.booking_id]?.booking_reference || p.booking_id?.slice(0, 8)?.toUpperCase(),
      clientName: bookingMap[p.booking_id]?.client_name || null,
      clientEmail: bookingMap[p.booking_id]?.client_email || null,
      checkIn: bookingMap[p.booking_id]?.check_in || null,
      checkOut: bookingMap[p.booking_id]?.check_out || null,
      amount: p.amount,
      currency: p.currency,
      reference: p.reference,
      status: p.status,
      notes: p.notes,
      declaredAt: p.created_at,
      ageDays: p.created_at
        ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    return NextResponse.json({ wires });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Wires pending error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}