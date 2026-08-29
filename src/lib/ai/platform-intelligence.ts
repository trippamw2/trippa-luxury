// ─── Kivara Platform Intelligence (Master OS §3/§4 — CEO + System Kernel) ─────
// The platform-wide "single pane of glass" that aggregates every AI agent's
// contribution into one operational health report. The CEO agent and the
// system kernel consume this to understand whether the whole AI-native
// organisation is working, where it is winning, and where attention is needed.
// Deterministic aggregation; never throws on DB or LLM failure.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";

export interface PlatformHealth {
  generatedAt: string;
  pipeline: {
    inquiries: number;
    bookings: number;
    conversionRate: number;
    pipelineValue: number; // value of confirmed bookings
  };
  supply: {
    suppliers: number;
    activeSuppliers: number;
    avgRating: number;
  };
  engagement: {
    savedJourneys: number;
    interactions: number;
  };
  finance: {
    totalRevenue: number;
    outstandingBalance: number;
  };
  score: number; // 0..100 composite platform health
  flags: string[];
}

export class PlatformIntelligence {
  async health(): Promise<PlatformHealth> {
    const client = createAdminClient();
    const [inquiriesRes, bookingsRes, suppliersRes, journeysRes] = await Promise.all([
      client.from("inquiries").select("id, status"),
      client
        .from("bookings")
        .select("id, status, total_amount, balance_amount, final_amount"),
      client.from("suppliers").select("id, status, rating"),
      client.from("saved_journeys").select("id"),
    ]);

    const inquiries = inquiriesRes.data || [];
    const bookings = bookingsRes.data || [];
    const suppliers = suppliersRes.data || [];
    const journeys = journeysRes.data || [];

    const confirmedBookings = bookings.filter(
      (b: { status?: string }) => b.status === "confirmed" || b.status === "completed"
    );
    const pipelineValue = confirmedBookings.reduce(
      (sum: number, b: { total_amount?: number }) => sum + (b.total_amount || 0),
      0
    );
    const totalRevenue = bookings.reduce(
      (sum: number, b: { total_amount?: number }) => sum + (b.total_amount || 0),
      0
    );
    const outstandingBalance = bookings.reduce(
      (sum: number, b: { balance_amount?: number }) => sum + (b.balance_amount || 0),
      0
    );

    const activeSuppliers = suppliers.filter(
      (s: { status?: string }) => s.status === "active"
    ).length;
    const rated = suppliers.filter((s: { rating?: number | null }) => typeof s.rating === "number");
    const avgRating =
      rated.length > 0
        ? Math.round((rated.reduce((sum: number, s: { rating?: number }) => sum + (s.rating || 0), 0) / rated.length) * 10) / 10
        : 0;

    const conversionRate = inquiries.length > 0 ? bookings.length / inquiries.length : 0;

    // Composite score: weighted, normalised to 0..100.
    const conversionScore = Math.min(100, conversionRate * 200); // 50% conversion → 100
    const supplyScore = Math.min(100, activeSuppliers * 10); // 10 active suppliers → 100
    const pipelineScore = Math.min(100, pipelineValue / 1000); // ~$100k → 100
    const engagementScore = Math.min(100, (journeys.length + inquiries.length) * 5);
    const score = Math.round(
      conversionScore * 0.3 + supplyScore * 0.25 + pipelineScore * 0.25 + engagementScore * 0.2
    );

    const flags: string[] = [];
    if (inquiries.length > 0 && conversionRate < 0.2) {
      flags.push("Conversion below 20% — sales follow-up needs attention.");
    }
    if (activeSuppliers < 3) {
      flags.push("Fewer than 3 active suppliers — supply risk.");
    }
    if (outstandingBalance > 50000) {
      flags.push("Outstanding balance above $50k — collections attention.");
    }

    return {
      generatedAt: new Date().toISOString(),
      pipeline: {
        inquiries: inquiries.length,
        bookings: bookings.length,
        conversionRate: Math.round(conversionRate * 100) / 100,
        pipelineValue,
      },
      supply: { suppliers: suppliers.length, activeSuppliers, avgRating },
      engagement: { savedJourneys: journeys.length, interactions: inquiryCount(inquiries) },
      finance: { totalRevenue, outstandingBalance },
      score,
      flags,
    };
  }
}

function inquiryCount(inquiries: unknown[]): number {
  return inquiries.length;
}

export const platformIntelligence = new PlatformIntelligence();
