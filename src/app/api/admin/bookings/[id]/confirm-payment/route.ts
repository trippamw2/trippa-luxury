import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, getIpFromRequest, sanitizeForAudit } from "@/lib/audit";
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
    const { profile } = await requireAdmin({ module: "finance", minRole: "editor" });
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

    // Send receipt email
    let receiptEmailStatus: "sent" | "failed" | "skipped" = "skipped";
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
        receiptEmailStatus = "sent";
      } catch (emailErr) {
        console.error("Failed to send receipt email:", emailErr);
        receiptEmailStatus = "failed";
      }
    }

    // ── Ledger writes ──────────────────────────────────────────────────────
    // FIX: the previous insert here used `type`/`description` columns that the
    // transactions table does not have, and an unchecked `payment_method`
    // value that the payment_methods FK rejected until migration 037 added the
    // `wire_transfer` slug. It silently failed, so no wire confirmation ever
    // reached the finance ledger. Write the real schema columns now and check
    // the result, and also write the granular `payments` row (migration 018)
    // that previously had no writer at all.
    const { error: transactionError } = await supabase.from("transactions").insert({
      booking_id: bookingId,
      transaction_type: isDeposit ? "deposit" : isFull ? "full_payment" : "balance",
      // The ledger records what actually arrived: the declared `amount`. The
      // audit entry below preserves the derived `paidAmount` alongside it so
      // the two can be reconciled if they ever disagree.
      amount: amount,
      currency: bookingCurrency,
      payment_method: "wire_transfer",
      payment_reference: paymentReference,
      notes: `Wire transfer received — ${paymentReference}`,
      receipt_sent: receiptEmailStatus === "sent",
    });
    if (transactionError) {
      console.error("Failed to write transactions ledger row:", transactionError.message);
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      booking_id: bookingId,
      amount: amount,
      currency: bookingCurrency,
      payment_method: "wire_transfer",
      payment_type: isDeposit ? "deposit" : isFull ? "full" : "balance",
      reference: paymentReference,
      swift_confirmation_code: paymentReference,
      notes: notes || null,
      status: "completed",
      paid_at: new Date().toISOString(),
      created_by: profile.id,
    });
    if (paymentError) {
      console.error("Failed to write payments ledger row:", paymentError.message);
    }

    // ── Audit trail ────────────────────────────────────────────────────────
    // Recorded last so the entry can state whether the guest actually received
    // the receipt. This is the money path, so it persists both the declared
    // amount and the amount the booking expected: `amount` arrives in the
    // request body while `paidAmount` is derived from the booking and the
    // reference suffix, and recording only one would hide a disagreement
    // between the ledger and the bank.
    await createAuditLog({
      tableName: "bookings",
      recordId: bookingId,
      action: "UPDATE",
      oldData: sanitizeForAudit({
        status: booking.status,
        balance_amount: balanceAmount,
        deposit_amount: depositAmount,
        deposit_confirmed_at: booking.deposit_confirmed_at,
      }),
      newData: sanitizeForAudit({
        status: newStatus,
        balance_amount: newBalance,
        payment_method: "wire_transfer",
        swift_confirmation_code: paymentReference,
        declared_amount: amount,
        expected_paid_amount: paidAmount,
        currency: bookingCurrency,
        receipt_email: receiptEmailStatus,
      }),
      performedBy: profile.id,
      ipAddress: getIpFromRequest(request),
    });

    await createAuditLog({
      tableName: "transactions",
      recordId: bookingId,
      action: "CREATE",
      newData: sanitizeForAudit({
        booking_id: bookingId,
        transaction_type: isDeposit ? "deposit" : isFull ? "full_payment" : "balance",
        payment_method: "wire_transfer",
        payment_reference: paymentReference,
        amount: paidAmount,
        expected_paid_amount: paidAmount,
        declared_amount: amount,
        currency: bookingCurrency,
        notes: `Wire transfer received — ${paymentReference}`,
        receipt_sent: receiptEmailStatus === "sent",
      }),
      performedBy: profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({
      success: true,
      bookingId,
      status: newStatus,
      paidAmount,
      balanceRemaining: newBalance,
      email: { receipt: receiptEmailStatus },
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
