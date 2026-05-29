import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

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
    const activeBookings = (allBookings || []).filter((b: any) => activeStatuses.includes(b.status));

    const revenueBookings = (allBookings || []).filter((b: any) =>
      ["confirmed", "deposit_paid", "paid"].includes(b.status)
    );
    const totalRevenue = revenueBookings.reduce(
      (sum: number, b: any) => sum + (parseFloat(b.total_amount) || 0),
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
    (tourBookingsData || []).forEach((b: any) => {
      const tid = b.tour_id;
      if (!tourMap.has(tid)) tourMap.set(tid, { bookings: 0, revenue: 0 });
      const entry = tourMap.get(tid)!;
      entry.bookings += 1;
      entry.revenue += parseFloat(b.total_amount) || 0;
    });

    const tourSummary = (toursList || []).map((t: any) => ({
      name: t.title,
      bookings: tourMap.get(t.id)?.bookings || 0,
      revenue: tourMap.get(t.id)?.revenue || 0,
    })).sort((a: any, b: any) => b.bookings - a.bookings);

    // ── Supplier summary ──────────────────────────────────────────────
    const { data: suppliersList } = await supabase
      .from("suppliers")
      .select("name, category_id, commission_rate, id")
      .eq("status", "active")
      .limit(10);

    const { data: supplierCategories } = await supabase
      .from("supplier_categories")
      .select("id, name");

    const catMap = new Map((supplierCategories || []).map((c: any) => [c.id, c.name]));
    const { data: supplierBookings } = await supabase
      .from("booking_suppliers")
      .select("supplier_id, cost")
      .not("supplier_id", "is", null);

    const supRevMap = new Map<string, number>();
    (supplierBookings || []).forEach((s: any) => {
      supRevMap.set(s.supplier_id, (supRevMap.get(s.supplier_id) || 0) + (parseFloat(s.cost) || 0));
    });

    const supplierSummary = (suppliersList || []).map((s: any) => ({
      name: s.name,
      type: catMap.get(s.category_id) || "Unknown",
      commission: s.commission_rate,
      revenue: supRevMap.get(s.id) || 0,
    })).sort((a: any, b: any) => b.revenue - a.revenue);

    // ── Booking status distribution ───────────────────────────────────
    const bookingStatusDistribution = (allBookings || []).reduce(
      (acc: Record<string, number>, b: any) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // ── Monthly revenue trends (last 12 months) ────────────────────────
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const cutoffDate = twelveMonthsAgo.toISOString();

    const revenueBookingsAll = (allBookings || []).filter((b: any) =>
      ["confirmed", "deposit_paid", "paid", "completed"].includes(b.status)
    );

    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthTotal = revenueBookingsAll
        .filter((b: any) => {
          const created = b.created_at || b.start_date;
          if (!created) return false;
          const bMonth = created.slice(0, 7);
          return bMonth === yearMonth;
        })
        .reduce((sum: number, b: any) => sum + (parseFloat(b.total_amount) || 0), 0);
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
      const monthCount = (allBookings || []).filter((b: any) => {
        const created = b.created_at || b.start_date;
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
      recentInquiries: (recentInquiries || []).map((i: any) => ({
        name: i.full_name,
        email: i.email,
        destination: i.destination,
        date: i.created_at,
        status: i.status,
      })),
      upcomingBookings: (upcomingBookings || []).map((b: any) => ({
        ref: b.booking_reference,
        client: b.client_name,
        destination: b.destination,
        checkIn: b.start_date,
        status: b.status,
      })),
      tourSummary,
      supplierSummary,
      bookingStatusDistribution,
      monthlyRevenue,
      monthlyBookings,
    });
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
