import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleCreate, joinSingle, mapKeysToCamel } from "@/lib/api-helpers";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

const TABLE = "invoices";

/**
 * `invoices` has no client column - it carries only booking_id. The admin UI
 * shows a client, so the name is resolved from the related booking instead of
 * falling back to rendering a raw UUID.
 */
const SELECT_WITH_RELATIONS =
  "id, invoice_number, booking_id, invoice_type, issue_date, due_date, paid_at, line_items, subtotal, tax_amount, discount_amount, total_amount, currency, status, notes, sent_at, created_at, updated_at, bookings!invoices_booking_id_fkey(client_name, booking_reference)";

type InvoiceRow = Record<string, unknown> & {
  bookings?: { client_name?: string; booking_reference?: string } | null;
};

function mapRow(item: InvoiceRow) {
  const booking = joinSingle(item.bookings);
  return {
    ...mapKeysToCamel(item),
    clientName: booking?.client_name ?? null,
    bookingReference: booking?.booking_reference ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Same guard handleGetList("invoices") applied via TABLE_AUTH.
    await requireAdmin({ module: "finance", minRole: "admin" });
    const supabase = createAdminClient();

    const limitParam = new URL(request.url).searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    let query = supabase
      .from(TABLE)
      .select(SELECT_WITH_RELATIONS, { count: "exact" })
      .order("created_at", { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching invoices:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (data || []).map((row) => mapRow(row as InvoiceRow)),
      count: count || 0,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/finance/invoices:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return handleCreate(TABLE, body, request);
}
