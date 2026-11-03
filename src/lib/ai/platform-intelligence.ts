// ─── Kivara Platform Intelligence (Master OS §3/§4 — CEO + System Kernel) ─────
// The platform-wide "single pane of glass" that aggregates every AI agent's
// contribution into one operational health report. The CEO agent and the
// system kernel consume this to understand whether the whole AI-native
// organisation is working, where it is winning, and where attention is needed.
// Deterministic aggregation; never throws on DB or LLM failure.
// ─────────────────────────────────────────────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";
import { computeReadiness, type ReadinessReport } from "./platform-readiness";

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
  score: number; // 0..100 composite business health
  /**
   * Engineering/deployment completeness, separate from the business score.
   * The business score reflects commercial data volume; readiness reflects
   * whether the platform itself is fully built and configured.
   */
  readiness: ReadinessReport;
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

    const readiness = await collectReadiness(client);

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
      readiness,
      flags,
    };
  }
}

function inquiryCount(inquiries: unknown[]): number {
  return inquiries.length;
}

// ─── Readiness signals ───────────────────────────────────────────────────────

type AdminClient = ReturnType<typeof createAdminClient>;

async function probeSchema(
  client: AdminClient,
  table: string,
  column: string
): Promise<{ key: string; present: boolean }> {
  const { error } = await client.from(table).select(column).limit(1);
  return { key: `${table}.${column}`, present: !error };
}

async function collectReadiness(client: AdminClient): Promise<ReadinessReport> {
  const schemaArtifacts = await Promise.all([
    probeSchema(client, "inquiries", "attribution"),
    probeSchema(client, "leads", "attribution"),
    probeSchema(client, "testimonials", "published"),
    probeSchema(client, "testimonials", "source_feedback_id"),
    probeSchema(client, "agent_evaluation_events", "id"),
    probeSchema(client, "supplier_documents", "id"),
    probeSchema(client, "insights", "report"),
  ]);

  let storageBuckets: string[] = [];
  try {
    const { data } = await client.storage.listBuckets();
    storageBuckets = (data ?? []).map((bucket) => bucket.name);
  } catch {
    storageBuckets = [];
  }

  const hasEnv = (key: string) => Boolean(process.env[key]);

  const integrations = [
    { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service role", present: hasEnv("SUPABASE_SERVICE_ROLE_KEY") },
    { key: "NEXT_BREVO_KEY", label: "Brevo email", present: hasEnv("NEXT_BREVO_KEY") },
    { key: "PAYPAL_CLIENT_ID", label: "PayPal client id", present: hasEnv("PAYPAL_CLIENT_ID") },
    { key: "PAYPAL_CLIENT_SECRET", label: "PayPal secret", present: hasEnv("PAYPAL_CLIENT_SECRET") },
    { key: "CRON_SECRET", label: "Cron secret", present: hasEnv("CRON_SECRET") },
    {
      key: "LLM_PROVIDER",
      label: "LLM provider key",
      present: hasEnv("GEMINI_API_KEY") || hasEnv("GROQ_API_KEY") || hasEnv("DEEPSEEK_API_KEY"),
    },
    {
      key: "SENTRY_DSN",
      label: "Sentry error tracking",
      present: hasEnv("SENTRY_DSN") || hasEnv("NEXT_PUBLIC_SENTRY_DSN"),
    },
  ];

  const legacyStatuses = await client
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .in("status", ["deposit-paid", "balance-due", "in-progress"]);

  const missingAmount = await client
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .in("status", ["confirmed", "paid", "completed"])
    .is("total_amount", null);

  const missingContact = await client
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .in("status", ["confirmed", "paid", "completed"])
    .is("client_email", null);

  const dataIntegrity = [
    {
      key: "legacy_status_slugs",
      label: "Booking statuses normalised",
      ok: !legacyStatuses.error && (legacyStatuses.count ?? 0) === 0,
      detail: legacyStatuses.error
        ? "check failed"
        : `${legacyStatuses.count ?? 0} legacy row(s)`,
    },
    {
      key: "confirmed_booking_amounts",
      label: "Confirmed bookings have amounts",
      ok: !missingAmount.error && (missingAmount.count ?? 0) === 0,
      detail: missingAmount.error ? "check failed" : `${missingAmount.count ?? 0} missing`,
    },
    {
      key: "confirmed_booking_contacts",
      label: "Confirmed bookings have guest email",
      ok: !missingContact.error && (missingContact.count ?? 0) === 0,
      detail: missingContact.error ? "check failed" : `${missingContact.count ?? 0} missing`,
    },
  ];

  return computeReadiness({
    schemaArtifacts,
    storageBuckets,
    requiredBuckets: ["supplier-docs"],
    integrations,
    dataIntegrity,
  });
}

export const platformIntelligence = new PlatformIntelligence();
