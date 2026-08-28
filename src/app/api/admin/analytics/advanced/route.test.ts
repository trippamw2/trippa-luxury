import { describe, it, expect, vi, beforeEach } from "vitest";

type Settle = { data: unknown; error: unknown };

function chainedQuery(rows: unknown[], error: unknown = null): unknown {
  const settle: Settle = { data: rows, error };
  function chainable() {
    return new Proxy({} as object, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => resolve(settle);
        }
        if (prop === "select") {
          return () => chainable();
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

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin-auth")>();
  return {
    ...actual, // keep the REAL AdminAuthError class
    requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
  };
});

import { GET } from "@/app/api/admin/analytics/advanced/route";
import { AdminAuthError } from "@/lib/admin-auth";

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(undefined);
});

describe("GET /api/admin/analytics/advanced", () => {
  it("returns 401 when admin auth fails", async () => {
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Unauthorized", 401));
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns zeroed metrics when there is no data", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([])); // bookings
    mockFrom.mockReturnValueOnce(chainedQuery([])); // inquiries

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.conversionRate).toBe(0);
    expect(body.totalRevenue).toBe(0);
    expect(body.averageBookingValue).toBe(0);
    expect(body.repeatRate).toBe(0);
    expect(body.uniqueGuests).toBe(0);
    expect(body.monthlyRevenue).toEqual([]);
    expect(body.revenueByDestination).toEqual([]);
  });

  it("aggregates revenue by month, destination, guest repeat, and status", async () => {
    const bookings = [
      { id: "b1", status: "confirmed", total_amount: 10000, deposit_amount: 3000, balance_amount: 7000, currency: "USD", destination: "Zambia", client_email: "a@x.com", created_at: "2026-01-15T00:00:00Z" },
      { id: "b2", status: "confirmed", total_amount: 20000, deposit_amount: 6000, balance_amount: 14000, currency: "USD", destination: "Zambia", client_email: "a@x.com", created_at: "2026-05-10T00:00:00Z" },
      { id: "b3", status: "provisional", total_amount: 5000, deposit_amount: 0, balance_amount: 5000, currency: "USD", destination: "Kenya", client_email: "b@x.com", created_at: "2026-05-20T00:00:00Z" },
      { id: "b4", status: "cancelled", total_amount: 0, deposit_amount: 0, balance_amount: 0, currency: "USD", destination: "Zambia", client_email: "c@x.com", created_at: "2026-07-01T00:00:00Z" },
    ];
    const inquiries = [
      { id: "i1", status: "new", created_at: "2026-01-01T00:00:00Z" },
      { id: "i2", status: "new", created_at: "2026-02-01T00:00:00Z" },
      { id: "i3", status: "new", created_at: "2026-03-01T00:00:00Z" },
      { id: "i4", status: "new", created_at: "2026-04-01T00:00:00Z" },
      { id: "i5", status: "new", created_at: "2026-05-01T00:00:00Z" },
      { id: "i6", status: "new", created_at: "2026-06-01T00:00:00Z" },
    ];

    mockFrom.mockReturnValueOnce(chainedQuery(bookings));
    mockFrom.mockReturnValueOnce(chainedQuery(inquiries));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    // Total revenue = 10000 + 20000 + 5000 + 0 = 35000
    expect(body.totalRevenue).toBe(35000);
    expect(body.totalBookings).toBe(4);
    expect(body.totalInquiries).toBe(6);

    // Conversion = round(4/6*100) = round(66.66) = 67
    expect(body.conversionRate).toBe(67);
    // Avg value = round(35000/4) = 8750
    expect(body.averageBookingValue).toBe(8750);

    // Revenue by month — note the route only includes bookings with a truthy
    // total_amount, so the $0 cancelled booking (b4) is excluded from revenue.
    expect(body.monthlyRevenue).toEqual([
      { month: "2026-01", revenue: 10000 },
      { month: "2026-05", revenue: 25000 },
    ]);

    // Revenue by destination grouped, sorted desc
    expect(body.revenueByDestination).toEqual([
      { destination: "Zambia", revenue: 30000 },
      { destination: "Kenya", revenue: 5000 },
    ]);

    // Repeat rate: unique emails = a,b,c (3), returning (a, appears twice) = 1 → 33%
    expect(body.uniqueGuests).toBe(3);
    expect(body.returningGuests).toBe(1);
    expect(body.repeatRate).toBe(33);

    // Status distribution
    expect(body.statusCounts).toEqual({
      confirmed: 2,
      provisional: 1,
      cancelled: 1,
    });

    // Monthly bookings
    expect(body.monthlyBookings).toEqual([
      { month: "2026-01", count: 1 },
      { month: "2026-05", count: 2 },
      { month: "2026-07", count: 1 },
    ]);
  });
});
