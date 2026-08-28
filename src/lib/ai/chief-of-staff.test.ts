import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the admin client before importing the module under test
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock("@/lib/ai/customer-intelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/customer-intelligence")>();
  return {
    ...actual,
    getAllCustomerIntelligence: vi.fn(),
  };
});

import { generateDailyBriefing, generateWeeklyReview } from "@/lib/ai/chief-of-staff";
import { getAllCustomerIntelligence } from "@/lib/ai/customer-intelligence";

const mockGetAllCustomerIntelligence = getAllCustomerIntelligence as unknown as ReturnType<typeof vi.fn>;

// Helper to build a chained supabase query-builder mock that finally
// resolves to { data, error } once `.then`d.
function chainedQuery(rows: unknown[]) {
  const settle = { data: rows, error: null };

  function chainable() {
    return new Proxy({} as object, {
      get(_target, prop) {
        if (prop === "select" || prop === "order" || prop === "in" || prop === "eq" || prop === "gte" || prop === "limit") {
          return () => chainable();
        }
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => {
            resolve(settle);
          };
        }
        if (prop in settle) {
          return (settle as Record<string, unknown>)[prop as string];
        }
        return undefined;
      },
    });
  }

  return chainable();
}

beforeEach(() => {
  mockFrom.mockReset();
  mockGetAllCustomerIntelligence.mockReset();
  mockGetAllCustomerIntelligence.mockResolvedValue({
    customers: [],
    summary: {
      totalCustomers: 0,
      vipCount: 0,
      hotLeads: 0,
      atRiskCount: 0,
      averageEngagement: 0,
      totalLifetimeValue: 0,
    },
  });
});

describe("generateDailyBriefing", () => {
  it("returns no items and a calm summary when there is no activity", async () => {
    // Each .from() call in order: inquiries, bookings, tasks
    mockFrom.mockReturnValueOnce(chainedQuery([])); // inquiries
    mockFrom.mockReturnValueOnce(chainedQuery([])); // bookings
    mockFrom.mockReturnValueOnce(chainedQuery([])); // tasks

    const briefing = await generateDailyBriefing();

    expect(briefing.items).toEqual([]);
    expect(briefing.summary).toContain("No urgent items");
    expect(briefing.founder.highestLeverageAction).toContain("No critical action");
  });

  it("flags unassigned inquiries as bottlenecks", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([
      { id: "inq-1", full_name: "Alice", email: "alice@x.com", status: "new", assigned_to: null, created_at: new Date().toISOString(), sla_due_at: null },
    ])); // inquiries
    mockFrom.mockReturnValueOnce(chainedQuery([])); // bookings
    mockFrom.mockReturnValueOnce(chainedQuery([])); // tasks

    const briefing = await generateDailyBriefing();

    const bottleneck = briefing.today.bottlenecks.find(i => i.type === "bottleneck");
    expect(bottleneck).toBeDefined();
    expect(bottleneck?.title).toContain("Unassigned inquiry");
    expect(bottleneck?.action).toBe("delegate");
  });

  it("surfaces provisional bookings as pending decisions", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([])); // inquiries
    mockFrom.mockReturnValueOnce(chainedQuery([
      { id: "bk-1", booking_reference: "TRP-0001", client_name: "Bob", status: "provisional", total_amount: 10000, guest_profile_id: null, created_at: new Date().toISOString() },
    ])); // bookings
    mockFrom.mockReturnValueOnce(chainedQuery([])); // tasks

    const briefing = await generateDailyBriefing();

    const decision = briefing.today.pendingDecisions.find(i => i.type === "decision");
    expect(decision).toBeDefined();
    expect(decision?.title).toContain("TRP-0001");
    expect(decision?.action).toBe("approve");
  });

  it("surfaces hot leads flagged by the CRM layer as founder actions", async () => {
    mockGetAllCustomerIntelligence.mockResolvedValue({
      customers: [
        {
          id: "c-1", fullName: "Carol", email: "c@x.com", isVip: false,
          engagementScore: 80, leadTier: "hot", ltvPrediction: 5000,
          churnRisk: 0.1, totalBookings: 0, totalSpent: 0,
          segment: { primary: "new", value: "medium", lifecycle: "prospect" },
          daysSinceLastContact: 2, nextAction: "Send a tailored proposal.",
        },
      ],
      summary: { totalCustomers: 1, vipCount: 0, hotLeads: 1, atRiskCount: 0, averageEngagement: 80, totalLifetimeValue: 5000 },
    });
    mockFrom.mockReturnValueOnce(chainedQuery([])); // inquiries
    mockFrom.mockReturnValueOnce(chainedQuery([])); // bookings
    mockFrom.mockReturnValueOnce(chainedQuery([])); // tasks

    const briefing = await generateDailyBriefing();

    const lead = briefing.today.highValueLeads.find(i => i.type === "lead");
    expect(lead).toBeDefined();
    expect(lead?.title).toContain("Carol");
    expect(lead?.action).toBe("founder");
  });

  it("flags at-risk customers as risks", async () => {
    mockGetAllCustomerIntelligence.mockResolvedValue({
      customers: [
        {
          id: "c-2", fullName: "Dan", email: "d@x.com", isVip: false,
          engagementScore: 10, leadTier: "cold", ltvPrediction: 8000,
          churnRisk: 0.8, totalBookings: 2, totalSpent: 8000,
          segment: { primary: "repeat", value: "high", lifecycle: "returned" },
          daysSinceLastContact: 220, nextAction: "Re-engage: Customer has not been contacted in over 90 days.",
        },
      ],
      summary: { totalCustomers: 1, vipCount: 0, hotLeads: 0, atRiskCount: 1, averageEngagement: 10, totalLifetimeValue: 8000 },
    });
    mockFrom.mockReturnValueOnce(chainedQuery([])); // inquiries
    mockFrom.mockReturnValueOnce(chainedQuery([])); // bookings
    mockFrom.mockReturnValueOnce(chainedQuery([])); // tasks

    const briefing = await generateDailyBriefing();

    const risk = briefing.today.risks.find(i => i.type === "risk");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("high");
    expect(risk?.title).toContain("Dan");
  });
});

describe("generateWeeklyReview", () => {
  it("builds metrics and sections from weekly data", async () => {
    // orders: inquiries, bookings, tasks, payments
    mockFrom.mockReturnValueOnce(chainedQuery([
      { id: "i1", status: "new", created_at: new Date().toISOString() },
      { id: "i2", status: "new", created_at: new Date().toISOString() },
    ])); // inquiries
    mockFrom.mockReturnValueOnce(chainedQuery([
      { id: "b1", status: "confirmed", total_amount: 12000, created_at: new Date().toISOString(), confirmed_at: new Date().toISOString() },
    ])); // bookings
    mockFrom.mockReturnValueOnce(chainedQuery([
      { id: "t1", status: "done", completed_at: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: "t2", status: "todo", created_at: new Date().toISOString() },
    ])); // tasks
    mockFrom.mockReturnValueOnce(chainedQuery([
      { id: "p1", amount: 5000, status: "succeeded", created_at: new Date().toISOString() },
    ])); // payments

    const review = await generateWeeklyReview();

    expect(review.metrics.newInquiries).toBe(2);
    expect(review.metrics.convertedInquiries).toBeGreaterThan(0);
    expect(review.metrics.revenue).toBe(5000);
    expect(review.metrics.completedTasks).toBe(1);
    expect(review.metrics.openTasks).toBe(1);
    expect(review.sections.length).toBeGreaterThan(0);
    expect(review.highestLeverageAction.length).toBeGreaterThan(0);
  });

  it("recommends win-back when customers are at risk", async () => {
    mockGetAllCustomerIntelligence.mockResolvedValue({
      customers: [
        {
          id: "c-3", fullName: "Eve", email: "e@x.com", isVip: false,
          engagementScore: 10, leadTier: "cold", ltvPrediction: 6000,
          churnRisk: 0.7, totalBookings: 1, totalSpent: 6000,
          segment: { primary: "repeat", value: "high", lifecycle: "returned" },
          daysSinceLastContact: 200, nextAction: "Re-engage.",
        },
      ],
      summary: { totalCustomers: 1, vipCount: 0, hotLeads: 0, atRiskCount: 1, averageEngagement: 10, totalLifetimeValue: 6000 },
    });
    mockFrom.mockReturnValueOnce(chainedQuery([])); // inquiries
    mockFrom.mockReturnValueOnce(chainedQuery([])); // bookings
    mockFrom.mockReturnValueOnce(chainedQuery([])); // tasks
    mockFrom.mockReturnValueOnce(chainedQuery([])); // payments

    const review = await generateWeeklyReview();

    expect(review.highestLeverageAction.toLowerCase()).toContain("at-risk");
  });
});
