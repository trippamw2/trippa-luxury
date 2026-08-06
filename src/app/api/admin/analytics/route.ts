import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

/** Parse a DB value into a number (0 when absent/non-numeric) */
function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  return parseFloat(String(value ?? "")) || 0;
}

/** Stringify a DB value, dropping null/undefined */
function toString(value: unknown): string {
  return value == null ? "" : String(value);
}

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // ── Aggregate counts ──────────────────────────────────────────────
    const [propertiesRes, bookingsRes, inquiriesRes, toursRes, packagesRes, suppliersRes] =
      await Promise.all([
        supabase.from("properties").select("*", { count: "exact", head: true }),
        supabase.from("bookings").select("*", { count: "exact", head: true }),
        supabase.from("inquiries").select("*", { count: "exact", head: true }),
        supabase.from("tours").select("*", { count: "exact", head: true }),
        supabase.from("packages").select("*", { count: "exact", head: true }),
        supabase.from("suppliers").select("*", { count: "exact", head: true }),
      ]);

    // ── In-depth stats ────────────────────────────────────────────────
    const { data: newInquiries } = await supabase
      .from("inquiries")
      .select("id")
      .in("status", ["new", "read"]);

    const { data: allBookings } = await supabase
      .from("bookings")
      .select("status, total_amount, start_date, end_date");

    const activeStatuses = ["provisional", "deposit_paid", "confirmed", "balance_due", "paid", "in_progress"];
    const activeBookings = (allBookings || []).filter(
      (b: Record<string, unknown>) =>
        typeof b.status === "string" && activeStatuses.includes(b.status)
    );

    const revenueBookings = (allBookings || []).filter(
      (b: Record<string, unknown>) =>
        typeof b.status === "string" && ["confirmed", "deposit_paid", "paid"].includes(b.status)
    );
    const totalRevenue = revenueBookings.reduce(
      (sum: number, b: Record<string, unknown>) => sum + toNumber(b.total_amount),
      0
    );

    // ── Upcoming check-ins (next 7 days) ──────────────────────────────
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const today = now.toISOString().split("T")[0];
    const { count: upcomingCheckins } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .in("status", ["confirmed", "deposit_paid", "paid", "in_progress"])
      .gte("start_date", today)
      .lte("start_date", nextWeek);

    // ── Recent inquiries (last 5) ─────────────────────────────────────
    const { data: recentInquiries } = await supabase
      .from("inquiries")
      .select("full_name, email, destination, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5);

    // ── Upcoming bookings (next 5) ────────────────────────────────────
    const { data: upcomingBookings } = await supabase
      .from("bookings")
      .select("booking_reference, client_name, destination, start_date, status")
      .in("status", ["provisional", "deposit_paid", "confirmed", "paid", "in_progress"])
      .gte("start_date", today)
      .order("start_date", { ascending: true })
      .limit(5);

    // ── Tour summary ──────────────────────────────────────────────────
    const { data: toursList } = await supabase
      .from("tours")
      .select("title, id")
      .eq("is_active", true)
      .limit(10);

    const { data: tourBookingsData } = await supabase
      .from("bookings")
      .select("tour_id, total_amount")
      .not("tour_id", "is", null);

    const tourMap = new Map<string, { bookings: number; revenue: number }>();
    (tourBookingsData || []).forEach((b: Record<string, unknown>) => {
      const tid = toString(b.tour_id);
      if (!tid) return;
      if (!tourMap.has(tid)) tourMap.set(tid, { bookings: 0, revenue: 0 });
      const entry = tourMap.get(tid)!;
      entry.bookings += 1;
      entry.revenue += toNumber(b.total_amount);
    });

    const tourSummary = (toursList || [])
      .map((t: Record<string, unknown>) => ({
        name: toString(t.title),
        bookings: tourMap.get(toString(t.id))?.bookings || 0,
        revenue: tourMap.get(toString(t.id))?.revenue || 0,
      }))
      .sort((a, b) => b.bookings - a.bookings);

    // ── Supplier summary ──────────────────────────────────────────────
    const { data: suppliersList } = await supabase
      .from("suppliers")
      .select("name, category_id, commission_rate, id")
      .eq("status", "active")
      .limit(10);

    const { data: supplierCategories } = await supabase
      .from("supplier_categories")
      .select("id, name");

    const catMap = new Map<string, string>(
      (supplierCategories || []).map((c: Record<string, unknown>) => [
        toString(c.id),
        toString(c.name),
      ])
    );
    const { data: supplierBookings } = await supabase
      .from("booking_suppliers")
      .select("supplier_id, cost")
      .not("supplier_id", "is", null);

    const supRevMap = new Map<string, number>();
    (supplierBookings || []).forEach((s: Record<string, unknown>) => {
      const sid = toString(s.supplier_id);
      if (!sid) return;
      supRevMap.set(sid, (supRevMap.get(sid) || 0) + toNumber(s.cost));
    });

    const supplierSummary = (suppliersList || [])
      .map((s: Record<string, unknown>) => ({
        name: toString(s.name),
        type: catMap.get(toString(s.category_id)) || "Unknown",
        commission: toNumber(s.commission_rate),
        revenue: supRevMap.get(toString(s.id)) || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── Booking status distribution ───────────────────────────────────
    const bookingStatusDistribution = (allBookings || []).reduce(
      (acc: Record<string, number>, b: Record<string, unknown>) => {
        const status = toString(b.status);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // ── Monthly revenue trends (last 12 months) ────────────────────────
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const revenueBookingsAll = (allBookings || []).filter(
      (b: Record<string, unknown>) =>
        typeof b.status === "string" &&
        ["confirmed", "deposit_paid", "paid", "completed"].includes(b.status)
    );

    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthTotal = revenueBookingsAll
        .filter((b: Record<string, unknown>) => {
          const created = toString(b.created_at ?? b.start_date);
          if (!created) return false;
          const bMonth = created.slice(0, 7);
          return bMonth === yearMonth;
        })
        .reduce((sum: number, b: Record<string, unknown>) => sum + toNumber(b.total_amount), 0);
      monthlyRevenue.push({
        month: yearMonth,
        revenue: monthTotal,
      });
    }

    // ── Booking trends (bookings per month) ────────────────────────────
    const monthlyBookings: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthCount = (allBookings || []).filter((b: Record<string, unknown>) => {
        const created = toString(b.created_at ?? b.start_date);
        if (!created) return false;
        return created.slice(0, 7) === yearMonth;
      }).length;
      monthlyBookings.push({ month: yearMonth, count: monthCount });
    }

    return NextResponse.json({
      totalProperties: propertiesRes.count || 0,
      totalBookings: bookingsRes.count || 0,
      totalInquiries: inquiriesRes.count || 0,
      totalTours: toursRes.count || 0,
      totalPackages: packagesRes.count || 0,
      totalSuppliers: suppliersRes.count || 0,
      pendingInquiries: (newInquiries || []).length,
      activeBookings: activeBookings.length,
      totalRevenue,
      upcomingCheckins: upcomingCheckins || 0,
      recentInquiries: (recentInquiries || []).map((i: Record<string, unknown>) => ({
        name: toString(i.full_name),
        email: toString(i.email),
        destination: toString(i.destination),
        date: toString(i.created_at),
        status: toString(i.status),
      })),
      upcomingBookings: (upcomingBookings || []).map((b: Record<string, unknown>) => ({
        ref: toString(b.booking_reference),
        client: toString(b.client_name),
        destination: toString(b.destination),
        checkIn: toString(b.start_date),
        status: toString(b.status),
      })),
      tourSummary,
      supplierSummary,
      bookingStatusDistribution,
      monthlyRevenue,
      monthlyBookings,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
