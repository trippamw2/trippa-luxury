import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, getIpFromRequest, sanitizeForAudit } from "@/lib/audit";
import { sendEmail, paymentReceiptEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { registerFinanceFromBooking } from "@/lib/pipeline/register";

/**
 * POST /api/admin/bookings/[id]/confirm-payment
 * Admin confirms a payment has been received — wire transfer or PayPal.
 *
 * Body: { paymentReference, amount, currency, paymentMethod?, notes? }
 * paymentMethod defaults to "wire_transfer"; "paypal" reconciles a PayPal
 * payment whose capture did not settle the booking automatically.
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
    const { paymentReference, amount, currency = "USD", notes, paymentMethod = "wire_transfer" } = body;

    if (paymentMethod !== "wire_transfer" && paymentMethod !== "paypal") {
      return NextResponse.json(
        { error: "paymentMethod must be 'wire_transfer' or 'paypal'" },
        { status: 400 }
      );
    }

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
    const isWire = paymentMethod === "wire_transfer";
    const methodLabel = isWire ? "Wire Transfer" : "PayPal";

    // Determine payment type from the reference suffix. `generatePaymentReference`
    // emits -DEPOSIT / -BALANCE / -FULL (uppercased type), and declined older
    // references may carry the short -DEP form. Both must map to the same branch:
    // treating a deposit reference as a balance payment would mark the booking
    // paid and write `transaction_type: "balance"` for what was actually a deposit.
    const refParts = paymentReference.split("-");
    const typeSuffix = refParts[refParts.length - 1];
    const isDeposit = typeSuffix === "DEP" || typeSuffix === "DEPOSIT";
    const isFull = typeSuffix === "FULL";

    const declaredAmount = Number(amount) || 0;

    let newStatus: string;
    let paidAmount: number;
    let newBalance: number;

    if (isDeposit) {
      // A deposit reference confirms the deposit stage whether or not the wire
      // clears the full deposit in a single transfer.
      newStatus = "deposit_paid";
      paidAmount = declaredAmount || depositAmount || Math.round(totalAmount * 0.3);
      newBalance = Math.max(totalAmount - paidAmount, 0);
    } else if (isFull) {
      // A -FULL reference means the guest settled the whole amount.
      newStatus = "paid";
      paidAmount = totalAmount;
      newBalance = 0;
    } else {
      // Balance/partial payment: the reference suffix alone cannot decide the
      // status. What matters is whether the declared amount clears the
      // outstanding balance — a short payment must leave the booking Balance
      // Due with the remaining balance, never silently "Paid in Full".
      paidAmount = declaredAmount;
      const outstanding = balanceAmount > 0 ? balanceAmount : Math.max(totalAmount - depositAmount, 0);
      newBalance = Math.max(outstanding - paidAmount, 0);
      newStatus = newBalance <= 0 ? "paid" : "balance_due";
    }

    // Update the booking
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      payment_method: paymentMethod,
      balance_amount: newBalance,
      deposit_confirmed_at: isDeposit ? new Date().toISOString() : booking.deposit_confirmed_at,
      internal_notes: notes
        ? `${booking.internal_notes ? booking.internal_notes + "\n\n" : ""}[${methodLabel} Confirmed] ${paymentReference}: ${currency} ${Number(amount).toLocaleString()}. ${notes}`
        : booking.internal_notes,
    };
    // Wire transfers are reconciled by the operator against the SWIFT code that
    // belongs on the booking; PayPal settlements are keyed to the capture id in
    // the payments ledger instead, so its booking row carries no swift fields.
    if (isWire) {
      updatePayload.swift_confirmation_code = paymentReference;
      updatePayload.swift_confirmed_at = new Date().toISOString();
    }

    await supabase.from("bookings").update(updatePayload).eq("id", bookingId);

    // Send receipt email
    let receiptEmailStatus: "sent" | "failed" | "skipped" = "skipped";
    if (booking.client_email) {
      try {
        const receipt = paymentReceiptEmail({
          clientName: booking.client_name || "Valued Guest",
          amount: `${bookingCurrency} ${amount.toLocaleString()}`,
          bookingRef: booking.booking_reference || bookingId.slice(0, 8).toUpperCase(),
          paymentMethod: methodLabel,
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
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      notes: `${methodLabel} received — ${paymentReference}`,
      receipt_sent: receiptEmailStatus === "sent",
    });
    if (transactionError) {
      console.error("Failed to write transactions ledger row:", transactionError.message);
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      booking_id: bookingId,
      amount: amount,
      currency: bookingCurrency,
      payment_method: paymentMethod,
      payment_type: isDeposit ? "deposit" : isFull ? "full" : "balance",
      reference: paymentReference,
      // Wire carries the SWIFT code on the row; PayPal the capture id, which the
      // unique partial index (migration 037) makes idempotent against capture.
      ...(isWire
        ? { swift_confirmation_code: paymentReference }
        : { paypal_transaction_id: paymentReference }),
      notes: notes || null,
      status: "completed",
      paid_at: new Date().toISOString(),
      created_by: profile.id,
    });
    if (paymentError) {
      // For PayPal, a unique violation on paypal_transaction_id just means the
      // execute/webhook path recorded this capture first — expected, not an error.
      if (!(paymentMethod === "paypal" && paymentError.code === "23505")) {
        console.error("Failed to write payments ledger row:", paymentError.message);
      }
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
        payment_method: paymentMethod,
        ...(isWire ? { swift_confirmation_code: paymentReference } : {}),
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
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        amount: paidAmount,
        expected_paid_amount: paidAmount,
        declared_amount: amount,
        currency: bookingCurrency,
        notes: `${methodLabel} received — ${paymentReference}`,
        receipt_sent: receiptEmailStatus === "sent",
      }),
      performedBy: profile.id,
      ipAddress: getIpFromRequest(request),
    });

    // Surface the money movement in the admin bell.
    await createNotification({
      type: "payment_received",
      title: `Payment received for ${booking.booking_reference || bookingId.slice(0, 8).toUpperCase()}`,
      body: `${bookingCurrency} ${Number(amount).toLocaleString()} — ${
        isDeposit ? "deposit" : isFull ? "full payment" : "balance"
      }`,
      link: "/admin/finance",
      entityType: "booking",
      entityId: bookingId,
    });

    // ── Automated pipeline: paid booking -> invoice + journey progress ─────
    // Non-fatal: confirming a payment must never fail because the invoice
    // registration reported an issue. Errors are logged and surfaced.
    const financeResult = await registerFinanceFromBooking(bookingId, {
      paymentType: isDeposit ? "deposit" : isFull ? "full" : "balance",
      amount: declaredAmount,
      currency: bookingCurrency,
      paymentReference,
      paymentMethod,
      notes: notes || null,
    });
    if (financeResult.error) {
      console.error("Finance registration issue:", financeResult.error);
    }

    return NextResponse.json({
      success: true,
      bookingId,
      status: newStatus,
      paidAmount,
      balanceRemaining: newBalance,
      email: { receipt: receiptEmailStatus },
      finance: {
        invoiceId: financeResult.invoiceId,
        invoiceNumber: financeResult.invoiceNumber,
        invoiceRegistered: financeResult.registered,
        invoiceError: financeResult.error,
      },
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
