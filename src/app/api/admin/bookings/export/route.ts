import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { toCsv, csvFilename } from "@/lib/csv";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status");

    let query = supabase
      .from("bookings")
      .select("booking_reference, client_name, client_email, client_phone, destination, start_date, end_date, guests_count, total_amount, deposit_amount, balance_amount, status, created_at")
      .order("created_at", { ascending: false });

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error exporting bookings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const csvData = toCsv(data || [], [
      { key: "booking_reference", label: "Reference" },
      { key: "client_name", label: "Client Name" },
      { key: "client_email", label: "Email" },
      { key: "client_phone", label: "Phone" },
      { key: "destination", label: "Destination" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
      { key: "guests_count", label: "Guests" },
      { key: "total_amount", label: "Total Amount" },
      { key: "deposit_amount", label: "Deposit" },
      { key: "balance_amount", label: "Balance" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Created At" },
    ]);

    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("kivara-bookings")}"`,
      },
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Bookings export error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
