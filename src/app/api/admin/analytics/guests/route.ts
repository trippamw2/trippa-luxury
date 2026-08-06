import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";

type GuestAnalyticsRow = {
  country: string | null;
  source: string | null;
  travel_style: string | null;
  is_couple: boolean | null;
  interests: string[] | null;
  budget_range: string | null;
  total_spent: string | null;
  total_bookings: number | null;
};

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // ── Aggregate counts ──────────────────────────────────────────────
    const { count: totalGuests } = await supabase
      .from("guest_profiles")
      .select("*", { count: "exact", head: true });

    // ── VIP count ─────────────────────────────────────────────────────
    const { count: vipGuests } = await supabase
      .from("guest_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_vip", true);

    // ── Repeat guests (more than 1 booking) ───────────────────────────
    const { count: repeatGuests } = await supabase
      .from("guest_profiles")
      .select("*", { count: "exact", head: true })
      .gt("total_bookings", 1);

    // ── All guest profiles for breakdowns ─────────────────────────────
    const { data: guests } = await supabase
      .from("guest_profiles")
      .select("country, source, travel_style, is_couple, interests, budget_range, total_spent, total_bookings, last_trip_date, created_at")
      .limit(1000);

    const guestList: GuestAnalyticsRow[] = guests || [];

    // ── Country distribution ──────────────────────────────────────────
    const countryCount: Record<string, number> = {};
    guestList.forEach((g) => {
      if (g.country) {
        countryCount[g.country] = (countryCount[g.country] || 0) + 1;
      }
    });
    const topCountries = Object.entries(countryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    // ── Source distribution ───────────────────────────────────────────
    const sourceCount: Record<string, number> = {};
    guestList.forEach((g) => {
      const src = g.source || "unknown";
      sourceCount[src] = (sourceCount[src] || 0) + 1;
    });
    const sourceDistribution = Object.entries(sourceCount)
      .sort(([, a], [, b]) => b - a)
      .map(([source, count]) => ({ source, count }));

    // ── Travel style distribution ─────────────────────────────────────
    const styleCount: Record<string, number> = {};
    guestList.forEach((g) => {
      if (g.travel_style) {
        styleCount[g.travel_style] = (styleCount[g.travel_style] || 0) + 1;
      }
    });
    const travelStyleDistribution = Object.entries(styleCount)
      .sort(([, a], [, b]) => b - a)
      .map(([style, count]) => ({ style, count }));

    // ── Couples vs solo ───────────────────────────────────────────────
    const couples = guestList.filter((g) => g.is_couple === true).length;
    const solo = guestList.filter((g) => g.is_couple === false).length;

    // ── Interests (flatten JSONB arrays) ──────────────────────────────
    const interestCount: Record<string, number> = {};
    guestList.forEach((g) => {
      const interests = g.interests;
      if (Array.isArray(interests)) {
        interests.forEach((interest: string) => {
          interestCount[interest] = (interestCount[interest] || 0) + 1;
        });
      }
    });
    const topInterests = Object.entries(interestCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([interest, count]) => ({ interest, count }));

    // ── Budget range distribution ─────────────────────────────────────
    const budgetCount: Record<string, number> = {};
    guestList.forEach((g) => {
      if (g.budget_range) {
        budgetCount[g.budget_range] = (budgetCount[g.budget_range] || 0) + 1;
      }
    });
    const budgetDistribution = Object.entries(budgetCount)
      .sort(([, a], [, b]) => b - a)
      .map(([range, count]) => ({ range, count }));

    return NextResponse.json({
      totalGuests: totalGuests || 0,
      vipGuests: vipGuests || 0,
      repeatGuests: repeatGuests || 0,
      couples,
      solo,
      topCountries,
      sourceDistribution,
      travelStyleDistribution,
      topInterests,
      budgetDistribution,
      avgSpentPerGuest: guestList.length > 0
        ? guestList.reduce((s: number, g) => s + (parseFloat(g.total_spent ?? "") || 0), 0) / guestList.length
        : 0,
      avgBookingsPerGuest: guestList.length > 0
        ? guestList.reduce((s: number, g) => s + (g.total_bookings || 0), 0) / guestList.length
        : 0,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Guest analytics error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
