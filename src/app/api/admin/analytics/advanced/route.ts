import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/analytics/advanced
 * Returns advanced analytics data for the dashboard.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch all bookings and inquiries for calculations
    const [bookingsResult, inquiriesResult] = await Promise.all([
      supabase.from("bookings").select("id, status, total_amount, deposit_amount, balance_amount, currency, destination, start_date, end_date, client_email, created_at"),
      supabase.from("inquiries").select("id, status, created_at"),
    ]);

    const bookings = bookingsResult.data || [];
    const inquiries = inquiriesResult.data || [];

    // ─── Revenue by Month ───────────────────────────────────────
    const revenueByMonth: Record<string, number> = {};
    bookings.forEach((b) => {
      if (b.created_at && b.total_amount) {
        const month = b.created_at.slice(0, 7); // "2026-01"
        revenueByMonth[month] = (revenueByMonth[month] || 0) + (b.total_amount || 0);
      }
    });
    const monthlyRevenue = Object.entries(revenueByMonth)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // ─── Conversion Rate (Inquiries → Bookings) ─────────────────
    const totalInquiries = inquiries.length;
    const totalBookings = bookings.length;
    const conversionRate = totalInquiries > 0
      ? Math.round((totalBookings / totalInquiries) * 100)
      : 0;

    // ─── Average Booking Value ──────────────────────────────────
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const averageBookingValue = totalBookings > 0
      ? Math.round(totalRevenue / totalBookings)
      : 0;

    // ─── Revenue by Destination ─────────────────────────────────
    const revenueByDest: Record<string, number> = {};
    bookings.forEach((b) => {
      const dest = b.destination || "Unknown";
      revenueByDest[dest] = (revenueByDest[dest] || 0) + (b.total_amount || 0);
    });
    const revenueByDestination = Object.entries(revenueByDest)
      .map(([destination, revenue]) => ({ destination, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 destinations

    // ─── Guest Repeat Rate ──────────────────────────────────────
    const emailCounts: Record<string, number> = {};
    bookings.forEach((b) => {
      if (b.client_email) {
        const email = b.client_email.toLowerCase();
        emailCounts[email] = (emailCounts[email] || 0) + 1;
      }
    });
    const uniqueGuests = Object.keys(emailCounts).length;
    const returningGuests = Object.values(emailCounts).filter((c) => c > 1).length;
    const repeatRate = uniqueGuests > 0
      ? Math.round((returningGuests / uniqueGuests) * 100)
      : 0;

    // ─── Booking Status Distribution ────────────────────────────
    const statusCounts: Record<string, number> = {};
    bookings.forEach((b) => {
      const status = b.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // ─── Monthly Bookings ───────────────────────────────────────
    const monthlyBookingsMap: Record<string, number> = {};
    bookings.forEach((b) => {
      if (b.created_at) {
        const month = b.created_at.slice(0, 7);
        monthlyBookingsMap[month] = (monthlyBookingsMap[month] || 0) + 1;
      }
    });
    const monthlyBookings = Object.entries(monthlyBookingsMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      monthlyRevenue,
      conversionRate,
      totalInquiries,
      totalBookings,
      averageBookingValue,
      totalRevenue,
      revenueByDestination,
      uniqueGuests,
      returningGuests,
      repeatRate,
      statusCounts,
      monthlyBookings,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
