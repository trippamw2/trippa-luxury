import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAuditLog, getIpFromRequest, sanitizeForAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { recordEvent } from "@/lib/ai/event-bus";

function generateRefundReference(): string {
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const hex = Math.random().toString(16).slice(2, 10).toUpperCase();
  return `KVR-RF-${yyyymmdd}-${hex}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;
  try {
    await requireAdmin({ module: "finance", minRole: "editor" });
    const supabase = createAdminClient();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, currency, total_amount, balance_amount, status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("id, amount, currency, status, reference, payment_method, payment_type, notes, paid_at, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    const completed = (payments || [])
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const refunded = (payments || [])
      .filter((p) => p.status === "refunded")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const refundable = Math.max(0, completed - refunded);

    return NextResponse.json({
      bookingId,
      currency: booking.currency,
      status: booking.status,
      totalAmount: booking.total_amount,
      balanceAmount: booking.balance_amount,
      refundable,
      payments: payments || [],
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Refund GET error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;
  try {
    const { profile } = await requireAdmin({ module: "finance", minRole: "admin" });
    const body = await request.json();
    const type = body?.type;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const amount = body?.amount;

    if (type !== "full" && type !== "partial") {
      return NextResponse.json({ error: "type must be 'full' or 'partial'" }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Read the booking.
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status, currency, total_amount, balance_amount, booking_reference, client_name, client_email")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "cancelled" || booking.status === "refunded") {
      return NextResponse.json({ error: "Booking is already cancelled or refunded" }, { status: 409 });
    }

    // Compute refundable.
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("amount, status")
      .eq("booking_id", bookingId);

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    const completed = (payments || [])
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const refunded = (payments || [])
      .filter((p) => p.status === "refunded")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const refundableBefore = Math.max(0, completed - refunded);

    let refundAmount: number;
    if (type === "full") {
      if (refundableBefore <= 0) {
        return NextResponse.json({ error: "nothing_to_refund" }, { status: 400 });
      }
      refundAmount = refundableBefore;
    } else {
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
      }
      if (amount > refundableBefore + 1e-9) {
        return NextResponse.json({ error: "exceeds_refundable" }, { status: 400 });
      }
      refundAmount = amount;
    }

    const refundableAfter = Math.max(0, refundableBefore - refundAmount);

    // Insert the refund payment row.
    const reference = generateRefundReference();
    const { error: insertError } = await supabase.from("payments").insert({
      booking_id: bookingId,
      amount: refundAmount,
      currency: booking.currency,
      payment_method: "other",
      payment_type: "balance",
      reference,
      status: "refunded",
      notes: reason,
      paid_at: new Date().toISOString(),
      created_by: profile.id,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update booking.
    const newBalance =
      type === "full"
        ? 0
        : Math.min(Number(booking.total_amount || 0), Number(booking.balance_amount || 0) + refundAmount);

    const updatePayload: Record<string, unknown> = {
      balance_amount: newBalance,
    };
    if (type === "full") {
      updatePayload.status = "refunded";
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Audit log.
    await createAuditLog({
      tableName: "bookings",
      action: "UPDATE",
      recordId: bookingId,
      oldData: sanitizeForAudit({ status: booking.status, balance_amount: booking.balance_amount }),
      newData: sanitizeForAudit({ ...updatePayload, refund_reference: reference, refund_amount: refundAmount }),
      performedBy: profile.id,
      ipAddress: getIpFromRequest(request),
    });

    // Event bus.
    try {
      await recordEvent({
        eventType: "PAYMENT_REFUNDED",
        entityType: "booking",
        entityId: bookingId,
        actorType: "human",
        correlationId: bookingId,
        payload: {
          amount: refundAmount,
          currency: booking.currency,
          type,
          reason,
          reference,
          refundableBefore,
          refundableAfter,
        },
        autonomyLevel: 4,
      });
    } catch (eventErr) {
      console.error("Failed to record PAYMENT_REFUNDED event:", eventErr);
    }

    // In-app notification to ops.
    try {
      await createNotification({
        type: "payment_refunded",
        title: `Refund processed for ${booking.booking_reference || bookingId.slice(0, 8).toUpperCase()}`,
        body: `${booking.currency} ${refundAmount.toLocaleString()} (${type}) — ${reason}`,
        link: `/admin/bookings/${bookingId}`,
        entityType: "booking",
        entityId: bookingId,
      });
    } catch (notifErr) {
      console.error("Failed to create refund notification:", notifErr);
    }

    return NextResponse.json({
      refund: { reference, amount: refundAmount, currency: booking.currency, type, reason },
      refundableBefore,
      refundableAfter,
      bookingStatus: type === "full" ? "refunded" : booking.status,
      balanceAmount: newBalance,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Refund error:", err);
    const message = err instanceof Error ? err.message : "Failed to process refund";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}