import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────
type Settle = { data: unknown; error: unknown };

// A mock supabase query chain that resolves to a { data, error } thenable.
function chainedQuery(rows: unknown[] | null, opts: { error?: unknown } = {}): unknown {
  const settle: Settle = { data: rows, error: opts.error ?? null };

  function chainable() {
    return new Proxy({} as object, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => resolve(settle);
        }
        if (
          prop === "select" ||
          prop === "in" ||
          prop === "lte" ||
          prop === "gt" ||
          prop === "is" ||
          prop === "eq" ||
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

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

// Must import the route AFTER mocks are registered (hoisted).
import { POST } from "@/app/api/cron/balance-reminders/route";

const baseBooking = {
  id: "bk-1",
  booking_reference: "TRP-0011",
  client_name: "Martinez Kaponda",
  client_email: "guest@example.com",
  start_date: "2026-09-10T00:00:00Z",
  balance_amount: 3500,
  currency: "USD",
};

function makeRequest(token: string | null): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/cron/balance-reminders", {
    method: "POST",
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("POST /api/cron/balance-reminders", () => {
  it("returns 401 when the bearer token is missing", async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(401);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token is wrong", async () => {
    const res = await POST(makeRequest("wrong-token"));
    expect(res.status).toBe(401);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(503);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("emails eligible bookings and marks them reminded", async () => {
    // .from("bookings").select(...)... -> returns bookings list
    mockFrom.mockReturnValueOnce(chainedQuery([baseBooking]));
    // .from("bookings").update(...).eq(...) -> for marking reminder sent
    mockFrom.mockReturnValueOnce(chainedQuery(null));
    mockSendEmail.mockResolvedValue(undefined);

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.message).toContain("1 balance reminder(s)");

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const emailArg = mockSendEmail.mock.calls[0][0];
    expect(emailArg.to[0].email).toBe("guest@example.com");
    expect(emailArg.subject).toContain("TRP-0011");
    expect(emailArg.htmlContent).toContain("Martinez Kaponda");
  });

  it("skips bookings without a client email", async () => {
    mockFrom.mockReturnValueOnce(
      chainedQuery([{ ...baseBooking, client_email: null }])
    );
    mockSendEmail.mockResolvedValue(undefined);

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns sent 0 when no bookings are eligible", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([]));
    mockSendEmail.mockResolvedValue(undefined);

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not let a single email failure abort the batch", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([baseBooking, baseBooking]));
    mockFrom.mockReturnValueOnce(chainedQuery(null)); // mark for bk #1
    mockFrom.mockReturnValueOnce(chainedQuery(null)); // mark for bk #2
    mockSendEmail
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    // One send failed, one succeeded — the successful one still counted.
    expect(body.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });
});
