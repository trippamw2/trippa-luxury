import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";
import { coerceAmendmentValue, hasAmendmentDrifted } from "@/lib/booking-amendments";

/**
 * POST /api/admin/bookings/[id]/amendments/[amendmentId]/apply
 *
 * Amendments were history-only: recording one never changed the booking. This
 * endpoint applies the recorded `new_value` to the booking, stamps who applied
 * it and when, and refuses to overwrite a field that has moved since the
 * amendment was captured (unless `?force=true`).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; amendmentId: string }> }
) {
  const { id, amendmentId } = await params;
  const force = new URL(request.url).searchParams.get("force") === "true";

  try {
    const auth = await requireAdmin({ module: "bookings", minRole: "editor" });
    const supabase = createAdminClient();

    const { data: amendment, error: amendmentError } = await supabase
      .from("booking_amendments")
      .select("*")
      .eq("id", amendmentId)
      .eq("booking_id", id)
      .single();

    if (amendmentError || !amendment) {
      return NextResponse.json({ error: "Amendment not found" }, { status: 404 });
    }
    if (amendment.applied_at) {
      return NextResponse.json({ error: "Amendment already applied" }, { status: 409 });
    }

    const coerced = coerceAmendmentValue(amendment.field, amendment.new_value);
    if (!coerced.ok) {
      return NextResponse.json({ error: coerced.error }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Drift guard: if the field moved since the amendment was recorded, the
    // operator must see the current value before overwriting it.
    const currentValue = (booking as Record<string, unknown>)[amendment.field];
    const drift = hasAmendmentDrifted(currentValue, amendment.old_value);

    if (drift && !force) {
      return NextResponse.json(
        {
          error: "Booking value changed since this amendment was recorded",
          currentValue: currentValue ?? null,
          recordedOldValue: amendment.old_value,
          hint: "Review the change, then retry with ?force=true",
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({ [amendment.field]: coerced.value, updated_at: now })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: updatedAmendment, error: stampError } = await supabase
      .from("booking_amendments")
      .update({ applied_at: now, applied_by: auth.profile.id })
      .eq("id", amendmentId)
      .select()
      .single();

    if (stampError) {
      // The booking already changed; surface the inconsistency instead of
      // pretending the amendment is still pending.
      console.error("Amendment applied but not stamped:", stampError);
      return NextResponse.json(
        {
          error: "Booking updated, but the amendment could not be marked applied",
          booking: updatedBooking,
        },
        { status: 500 }
      );
    }

    await createAuditLog({
      tableName: "bookings",
      recordId: id,
      action: "UPDATE",
      oldData: sanitizeForAudit({ [amendment.field]: currentValue }),
      newData: sanitizeForAudit({
        [amendment.field]: coerced.value,
        amendmentId,
        forced: drift ? force : false,
      }),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({
      data: {
        id: updatedAmendment.id,
        field: updatedAmendment.field,
        oldValue: updatedAmendment.old_value,
        newValue: updatedAmendment.new_value,
        appliedAt: updatedAmendment.applied_at,
        appliedBy: updatedAmendment.applied_by,
      },
      booking: updatedBooking,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error applying amendment ${amendmentId} to booking ${id}:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
