import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";
import { joinSingle } from "@/lib/api-helpers";

const TABLE = "supplier_payouts";

/**
 * GET  /api/admin/finance/payouts — list payouts with supplier + booking context.
 * POST /api/admin/finance/payouts — schedule/create a supplier payout.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin({ module: "finance", minRole: "admin" });
    const supabase = createAdminClient();

    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    let query = supabase
      .from(TABLE)
      .select(
        "id, supplier_id, booking_id, amount, currency, status, scheduled_date, paid_date, method, reference, notes, created_at, updated_at, suppliers(name), bookings(booking_reference, client_name)"
      )
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query.limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (data ?? []).map((p) => ({
        id: p.id,
        supplierId: p.supplier_id,
        supplierName: joinSingle(p.suppliers)?.name ?? "Unknown supplier",
        bookingId: p.booking_id,
        bookingReference: joinSingle(p.bookings)?.booking_reference ?? null,
        bookingClient: joinSingle(p.bookings)?.client_name ?? null,
        amount: p.amount,
        currency: p.currency || "USD",
        status: p.status,
        scheduledDate: p.scheduled_date,
        paidDate: p.paid_date,
        method: p.method,
        reference: p.reference,
        notes: p.notes,
        createdAt: p.created_at,
      })),
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/finance/payouts:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin({ module: "finance", minRole: "admin" });
    const supabase = createAdminClient();
    const body = await request.json();

    const supplierId = typeof body.supplierId === "string" ? body.supplierId.trim() : "";
    const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount);
    const currency = typeof body.currency === "string" ? body.currency.trim() : "USD";
    const scheduledDate = typeof body.scheduledDate === "string" && body.scheduledDate ? body.scheduledDate : null;
    const method = typeof body.method === "string" ? body.method.trim() : null;
    const reference = typeof body.reference === "string" ? body.reference.trim() : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;
    const bookingId = typeof body.bookingId === "string" && body.bookingId ? body.bookingId : null;

    if (!supplierId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Supplier and a positive amount are required" }, { status: 400 });
    }

    // Validate the supplier exists
    const { data: supplier } = await supabase.from("suppliers").select("id, name").eq("id", supplierId).maybeSingle();
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const { data: payout, error } = await supabase
      .from(TABLE)
      .insert({
        supplier_id: supplierId,
        booking_id: bookingId,
        amount,
        currency,
        status: "scheduled",
        scheduled_date: scheduledDate,
        method,
        reference,
        notes,
        created_by: auth.profile.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    createAuditLog({
      tableName: TABLE,
      recordId: payout.id,
      action: "CREATE",
      newData: sanitizeForAudit(payout),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json(
      {
        data: {
          id: payout.id,
          supplierId: payout.supplier_id,
          supplierName: supplier.name,
          amount: payout.amount,
          currency: payout.currency,
          status: payout.status,
          scheduledDate: payout.scheduled_date,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in POST /api/admin/finance/payouts:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
