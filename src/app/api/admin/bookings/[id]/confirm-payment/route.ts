import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { sendEmail, paymentReceiptEmail } from "@/lib/email";

/**
 * POST /api/admin/bookings/[id]/confirm-payment
 * Admin confirms a wire transfer payment has been received.
 *
 * Body: { paymentReference: string, amount: number, currency: string, notes?: string }
 * Updates booking status and sends receipt email.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin({ module: "finance", minRole: "editor" });
    const { id: bookingId } = await params;
    const body = await request.json();
    const { paymentReference, amount, currency = "USD", notes } = body;

    if (!paymentReference || !amount) {
      return NextResponse.json(
        { error: "paymentReference and amount are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch the booking
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, client_name, client_email, booking_reference, total_amount, deposit_amount, balance_amount, status, currency, deposit_confirmed_at, internal_notes")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const totalAmount = Number(booking.total_amount) || 0;
    const depositAmount = Number(booking.deposit_amount) || 0;
    const balanceAmount = Number(booking.balance_amount) || (totalAmount - depositAmount);
    const bookingCurrency = booking.currency || currency;

    // Determine payment type from the reference suffix
    const refParts = paymentReference.split("-");
    const typeSuffix = refParts[refParts.length - 1];
    const isDeposit = typeSuffix === "DEP";
    const isFull = typeSuffix === "FULL";

    let newStatus: string;
    let paidAmount: number;
    let newBalance: number;

    if (isDeposit) {
      newStatus = "deposit_paid";
      paidAmount = depositAmount || Math.round(totalAmount * 0.3);
      newBalance = totalAmount - paidAmount;
    } else if (isFull) {
      newStatus = "paid";
      paidAmount = totalAmount;
      newBalance = 0;
    } else {
      // Balance payment
      newStatus = "paid";
      paidAmount = balanceAmount;
      newBalance = 0;
    }

    // Update the booking
    await supabase
      .from("bookings")
      .update({
        status: newStatus,
        payment_method: "wire_transfer",
        swift_confirmation_code: paymentReference,
        swift_confirmed_at: new Date().toISOString(),
        balance_amount: newBalance,
        deposit_confirmed_at: isDeposit ? new Date().toISOString() : booking.deposit_confirmed_at,
        internal_notes: notes
          ? `${booking.internal_notes ? booking.internal_notes + "\n\n" : ""}[Wire Transfer Confirmed] ${paymentReference}: ${currency} ${amount.toLocaleString()}. ${notes}`
          : booking.internal_notes,
      })
      .eq("id", bookingId);

    // Log a transaction
    await supabase.from("transactions").insert({
      booking_id: bookingId,
      type: "income",
      amount: amount,
      currency: bookingCurrency,
      description: `Wire transfer received — ${paymentReference}`,
      payment_method: "wire_transfer",
    });

    // Send receipt email
    if (booking.client_email) {
      try {
        const receipt = paymentReceiptEmail({
          clientName: booking.client_name || "Valued Guest",
          amount: `${bookingCurrency} ${amount.toLocaleString()}`,
          bookingRef: booking.booking_reference || bookingId.slice(0, 8).toUpperCase(),
          paymentMethod: "Wire Transfer",
        });

        await sendEmail({
          to: [{ email: booking.client_email, name: booking.client_name || "Valued Guest" }],
          subject: receipt.subject,
          htmlContent: receipt.htmlContent,
        });
      } catch (emailErr) {
        console.error("Failed to send receipt email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      bookingId,
      status: newStatus,
      paidAmount,
      balanceRemaining: newBalance,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Confirm payment error:", err);
    const message = err instanceof Error ? err.message : "Failed to confirm payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
