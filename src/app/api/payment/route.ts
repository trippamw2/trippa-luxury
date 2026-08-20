import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PayPalClient } from "@/lib/paypal";
import { generatePaymentReference } from "@/lib/wire-transfer";

/**
 * POST /api/payment
 * Unified payment initiation endpoint.
 * Dispatches to PayPal or wire transfer based on the selected method.
 *
 * Body: { bookingId: string, method: "paypal" | "wire_transfer", type: "deposit" | "balance" | "full" }
 */
export async function POST(request: NextRequest) {
  try {
    const { bookingId, method, type = "balance" } = await request.json();

    if (!bookingId || !method) {
      return NextResponse.json(
        { error: "bookingId and method are required" },
        { status: 400 }
      );
    }

    if (method !== "paypal" && method !== "wire_transfer") {
      return NextResponse.json(
        { error: "Invalid payment method. Must be 'paypal' or 'wire_transfer'." },
        { status: 400 }
      );
    }

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Verify the booking exists and user has access
    const adminClient = createAdminClient();
    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select("id, client_name, client_email, booking_reference, total_amount, deposit_amount, balance_amount, currency")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check access: admin or owning guest
    const { data: adminProfile } = await adminClient
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!adminProfile) {
      if (booking.client_email !== user.email) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Calculate amount
    const totalAmount = Number(booking.total_amount) || 0;
    const depositAmount = Number(booking.deposit_amount) || 0;
    const balanceAmount = Number(booking.balance_amount) || (totalAmount - depositAmount);

    let amount: number;
    if (type === "deposit") {
      amount = depositAmount || Math.round(totalAmount * 0.3);
    } else if (type === "balance") {
      amount = balanceAmount;
    } else {
      amount = totalAmount;
    }

    const currency = booking.currency || "USD";
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Generate payment reference for all payments
    const paymentRef = generatePaymentReference(type, bookingId);

    // Store the reference on the booking
    await adminClient
      .from("bookings")
      .update({ payment_method: method })
      .eq("id", bookingId);

    if (method === "paypal") {
      const paypal = new PayPalClient();
      const payment = await paypal.createPayment({
        amount: String(amount),
        currency,
        description: `Kivara ${type === "deposit" ? "Deposit" : type === "balance" ? "Balance Payment" : "Full Payment"} — ${paymentRef.reference}`,
        returnUrl: `${baseUrl}/api/payment/paypal/execute?bookingId=${bookingId}&type=${type}`,
        cancelUrl: `${baseUrl}/payment/cancel?bookingId=${bookingId}`,
      });

      return NextResponse.json({
        method: "paypal",
        approvalUrl: payment.approvalUrl,
        paymentId: payment.paymentId,
        reference: paymentRef.reference,
        amount,
        currency,
      });
    }

    // Wire transfer — return reference and redirect to instructions page
    return NextResponse.json({
      method: "wire_transfer",
      redirectUrl: `${baseUrl}/payment/${bookingId}?type=${type}&method=wire_transfer`,
      reference: paymentRef.reference,
      amount,
      currency,
    });
  } catch (err: unknown) {
    console.error("Payment initiation error:", err);
    const message = err instanceof Error ? err.message : "Failed to initiate payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
