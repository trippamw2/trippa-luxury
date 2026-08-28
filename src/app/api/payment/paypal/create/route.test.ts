import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────
type Settle = { data: unknown; error: unknown };

// Admin-client chained query (supports .select/.eq/.maybeSingle/.update) that
// resolves to a { data, error } thenable.
function chainedQuery(row: unknown, error: unknown = null): unknown {
  const settle: Settle = { data: row, error };
  function chainable() {
    return new Proxy({} as object, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => resolve(settle);
        }
        if (
          prop === "select" ||
          prop === "eq" ||
          prop === "maybeSingle" ||
          prop === "update"
        ) {
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

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

const mockGeneratePaymentReference = vi.fn();
vi.mock("@/lib/wire-transfer", () => ({
  generatePaymentReference: (...args: unknown[]) =>
    mockGeneratePaymentReference(...args),
}));

const mockCreatePayment = vi.fn();
vi.mock("@/lib/paypal", () => ({
  PayPalClient: class {
    createPayment = mockCreatePayment;
  },
}));

// Import the route AFTER mocks are hoisted.
import { POST } from "@/app/api/payment/paypal/create/route";

const bookingId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/payment/paypal/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "admin@kivara.com" } },
  });
  mockGeneratePaymentReference.mockReturnValue({
    reference: "KVR-20260828-A1B2C3D4-BALANCE",
    bookingId,
    type: "balance",
    createdAt: "2026-08-28T00:00:00Z",
  });
  mockCreatePayment.mockResolvedValue({
    paymentId: "PAYID-123456",
    approvalUrl: "https://sandbox.paypal.com/webscr?cmd=_express-checkout&token=TOK",
  });
});

describe("POST /api/payment/paypal/create", () => {
  it("returns 400 when bookingId or amount is missing", async () => {
    const res = await POST(makeRequest({ amount: 100 }));
    expect(res.status).toBe(400);
    // No auth flow triggered.
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest({ bookingId, amount: 100 }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when a non-admin does not own the booking", async () => {
    // getUser -> guest
    mockGetUser.mockResolvedValue({
      data: { user: { id: "guest-1", email: "someone@example.com" } },
    });
    // 1st admin .from("admin_profiles").select().eq().maybeSingle() -> no admin
    mockAdminFrom.mockReturnValueOnce(chainedQuery(null));
    // 2nd admin .from("bookings").select().eq().maybeSingle() -> booking owned by another email
    mockAdminFrom.mockReturnValueOnce(
      chainedQuery({ id: bookingId, guest_email: "owner@example.com" })
    );

    const res = await POST(makeRequest({ bookingId, amount: 100 }));
    expect(res.status).toBe(403);
  });

  it("allows an admin user and creates a payment", async () => {
    // admin_profiles -> found (admin)
    mockAdminFrom.mockReturnValueOnce(chainedQuery({ id: "user-1" }));
    // .from("bookings").update(...).eq(...) -> mark swift code
    mockAdminFrom.mockReturnValueOnce(chainedQuery(null));

    const res = await POST(makeRequest({ bookingId, amount: 3500, currency: "USD", type: "balance" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.approvalUrl).toContain("sandbox.paypal.com");
    expect(body.paymentId).toBe("PAYID-123456");
    expect(body.reference).toBe("KVR-20260828-A1B2C3D4-BALANCE");

    expect(mockCreatePayment).toHaveBeenCalledTimes(1);
    const params = mockCreatePayment.mock.calls[0][0];
    expect(params.amount).toBe("3500");
    expect(params.currency).toBe("USD");
  });

  it("allows a guest who owns the booking", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "guest-1", email: "owner@example.com" } },
    });
    // admin_profiles -> not an admin
    mockAdminFrom.mockReturnValueOnce(chainedQuery(null));
    // bookings -> owned by this guest
    mockAdminFrom.mockReturnValueOnce(
      chainedQuery({ id: bookingId, guest_email: "owner@example.com" })
    );
    // update -> mark swift code
    mockAdminFrom.mockReturnValueOnce(chainedQuery(null));

    const res = await POST(makeRequest({ bookingId, amount: 500, currency: "EUR", type: "deposit" }));
    expect(res.status).toBe(200);
    expect(mockCreatePayment).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when PayPal creation fails", async () => {
    mockAdminFrom.mockReturnValueOnce(chainedQuery({ id: "user-1" })); // admin
    mockAdminFrom.mockReturnValueOnce(chainedQuery(null)); // update
    mockCreatePayment.mockRejectedValue(new Error("PayPal down"));

    const res = await POST(makeRequest({ bookingId, amount: 100 }));
    expect(res.status).toBe(500);
  });
});
