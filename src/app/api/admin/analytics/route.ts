import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const [propertiesRes, bookingsRes, inquiriesRes, toursRes, packagesRes] = await Promise.all([
      supabase.from("properties").select("*", { count: "exact", head: true }),
      supabase.from("bookings").select("*", { count: "exact", head: true }),
      supabase.from("inquiries").select("*", { count: "exact", head: true }),
      supabase.from("tours").select("*", { count: "exact", head: true }),
      supabase.from("packages").select("*", { count: "exact", head: true }),
    ]);

    const totalProperties = propertiesRes.count || 0;
    const totalBookings = bookingsRes.count || 0;
    const totalInquiries = inquiriesRes.count || 0;
    const totalTours = toursRes.count || 0;
    const totalPackages = packagesRes.count || 0;

    const { data: newInquiries } = await supabase
      .from("inquiries")
      .select("status")
      .in("status", ["new", "read"]);

    const { data: bookingStatuses } = await supabase
      .from("bookings")
      .select("status");

    const { data: bookingRevenue } = await supabase
      .from("bookings")
      .select("total_amount, status")
      .in("status", ["confirmed", "deposit_paid", "paid"]);

    const totalRevenue = (bookingRevenue || []).reduce(
      (sum: number, b: any) => sum + (parseFloat(b.total_amount) || 0),
      0
    );

    return NextResponse.json({
      totalProperties,
      totalBookings,
      totalInquiries,
      totalTours,
      totalPackages,
      pendingInquiries: (newInquiries || []).length,
      totalRevenue,
      bookingStatusDistribution: (bookingStatuses || []).reduce((acc: Record<string, number>, b: any) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
