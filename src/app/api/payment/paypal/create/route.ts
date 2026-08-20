import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PayPalClient } from "@/lib/paypal";
import { generatePaymentReference } from "@/lib/wire-transfer";

/**
 * POST /api/payment/paypal/create
 * Creates a PayPal payment for a booking.
 * Accessible to admin users AND authenticated guests who own the booking.
 *
 * Body: { bookingId: string, amount: number, currency: string, type: "deposit" | "balance" | "full" }
 * Returns: { approvalUrl: string, paymentId: string, reference: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { bookingId, amount, currency = "USD", type = "balance" } = await request.json();

    if (!bookingId || !amount) {
      return NextResponse.json({ error: "bookingId and amount are required" }, { status: 400 });
    }

    // Auth check: must be authenticated as admin or guest
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Check if user is an admin
    const adminClient = createAdminClient();
    const { data: adminProfile } = await adminClient
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!adminProfile) {
      // Not an admin — verify guest owns this booking
      const { data: booking } = await adminClient
        .from("bookings")
        .select("id, guest_email")
        .eq("id", bookingId)
        .maybeSingle();

      if (!booking || booking.guest_email !== user.email) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Generate a payment reference for this transaction
    const paymentRef = generatePaymentReference(type, bookingId);

    // Store the reference on the booking
    await adminClient
      .from("bookings")
      .update({ swift_confirmation_code: paymentRef.reference })
      .eq("id", bookingId);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const paypal = new PayPalClient();
    const payment = await paypal.createPayment({
      amount: String(amount),
      currency,
      description: `Kivara ${type === "deposit" ? "Deposit" : type === "balance" ? "Balance Payment" : "Full Payment"} — ${paymentRef.reference}`,
      returnUrl: `${baseUrl}/api/payment/paypal/execute?bookingId=${bookingId}&type=${type}`,
      cancelUrl: `${baseUrl}/payment/cancel?bookingId=${bookingId}`,
    });

    return NextResponse.json({
      approvalUrl: payment.approvalUrl,
      paymentId: payment.paymentId,
      reference: paymentRef.reference,
    });
  } catch (err: unknown) {
    console.error("PayPal create error:", err);
    const message = err instanceof Error ? err.message : "Failed to create PayPal payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
