import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PayPalClient } from "@/lib/paypal";
import { generatePaymentReference } from "@/lib/wire-transfer";
import { derivePayableAmount, isPaymentType, isPricedWithinLimit } from "@/lib/payments/amounts";

/**
 * POST /api/payment/paypal/create
 * Creates a PayPal payment for a booking.
 * Accessible to admin users AND authenticated guests who own the booking.
 *
 * Body: { bookingId: string, type: "deposit" | "balance" | "full" }
 *   `amount`/`currency` are NOT client-authoritative: the amount is always
 *   derived from the booking row. A client-supplied amount is accepted only
 *   when it agrees, so a stale UI cannot silently underpay a booking.
 * Returns: { approvalUrl: string, paymentId: string, reference: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { bookingId, amount, currency, type = "balance" } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    if (!isPaymentType(type)) {
      return NextResponse.json(
        { error: "type must be one of deposit, balance, full" },
        { status: 400 }
      );
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

    // Price the order from the booking row, never from client input. Trusting the
    // caller's `amount` lets a guest request a $1 PayPal order for a $5,000
    // booking they own.
    const { data: pricedBooking } = await adminClient
      .from("bookings")
      .select("id, total_amount, deposit_amount, currency")
      .eq("id", bookingId)
      .maybeSingle();

    const payable = pricedBooking
      ? derivePayableAmount(pricedBooking, type)
      : null;

    if (!payable) {
      return NextResponse.json(
        { error: "This booking cannot be priced for payment" },
        { status: 409 }
      );
    }

    if (!isPricedWithinLimit(payable.amount)) {
      return NextResponse.json(
        { error: "This booking has no payable amount" },
        { status: 409 }
      );
    }

    // If a client did send an amount, it must agree. A mismatch is a bug or an
    // attempt, never something to silently honour.
    if (typeof amount === "number" && Math.round(amount * 100) !== Math.round(payable.amount * 100)) {
      return NextResponse.json(
        {
          error: "Amount does not match this booking",
          expected: payable.amount,
          currency: payable.currency,
        },
        { status: 409 }
      );
    }

    if (currency && currency !== payable.currency) {
      return NextResponse.json(
        { error: "Currency does not match this booking", expected: payable.currency },
        { status: 409 }
      );
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
      amount: payable.amount.toFixed(2),
      currency: payable.currency,
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
