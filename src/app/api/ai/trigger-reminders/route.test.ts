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
          prop === "not" ||
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
import { POST } from "@/app/api/ai/trigger-reminders/route";

// A confirmed booking that started in the past — every pre-trip reminder
// (n30, n14, n7, n1, day-of) is therefore due.
const basePreTripBooking = {
  id: "bk-pre-1",
  booking_reference: "TRP-0101",
  client_name: "Martinez Kaponda",
  client_email: "guest@example.com",
  destination: "South Luangwa",
  start_date: "2026-08-01T00:00:00Z",
  reminders_sent: null,
};

// A completed booking that ended in the past — every post-trip follow-up
// (d1, d7, d30) is therefore due.
const basePostTripBooking = {
  id: "bk-post-1",
  booking_reference: "TRP-0102",
  client_name: "Amara Banda",
  client_email: "returned@example.com",
  destination: "Lake Malawi",
  end_date: "2026-07-01T00:00:00Z",
  followups_sent: null,
};

function makeRequest(token: string | null): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/ai/trigger-reminders", {
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

describe("POST /api/ai/trigger-reminders", () => {
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

  it("emails all due pre-trip reminders and persists reminders_sent", async () => {
    // .from("bookings").select(...).in(status).not(start_date null) → pre-trip rows
    mockFrom.mockReturnValueOnce(chainedQuery([basePreTripBooking]));
    // second .from("bookings") → post-trip rows (none)
    mockFrom.mockReturnValueOnce(chainedQuery([]));
    // .from("bookings").update({ reminders_sent }).eq(id) → mark sent
    mockFrom.mockReturnValueOnce(chainedQuery(null));
    mockSendEmail.mockResolvedValue(undefined);

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    // 5 pre-trip reminder types are all due for a past start date
    expect(body.sent).toBe(5);
    expect(body.errors).toBe(0);
    expect(mockSendEmail).toHaveBeenCalledTimes(5);

    // from() called 3 times: pre-trip select, post-trip select, then the
    // update that persisted reminders_sent (idempotency data)
    expect(mockFrom).toHaveBeenCalledTimes(3);

    const emailArg = mockSendEmail.mock.calls[0][0];
    expect(emailArg.to[0].email).toBe("guest@example.com");
    expect(emailArg.htmlContent).toContain("TRP-0101");
  });

  it("does not resend reminder types already recorded in reminders_sent", async () => {
    mockFrom.mockReturnValueOnce(
      chainedQuery([
        {
          ...basePreTripBooking,
          reminders_sent: [
            { type: "n30", sentAt: "2026-07-01T00:00:00Z" },
            { type: "n14", sentAt: "2026-07-14T00:00:00Z" },
            { type: "n7", sentAt: "2026-07-20T00:00:00Z" },
            { type: "n1", sentAt: "2026-07-30T00:00:00Z" },
            { type: "day-of", sentAt: "2026-08-01T00:00:00Z" },
          ],
        },
      ])
    );
    mockFrom.mockReturnValueOnce(chainedQuery([]));

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.errors).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("emails due post-trip follow-ups for completed bookings", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([])); // pre-trip rows (none)
    mockFrom.mockReturnValueOnce(chainedQuery([basePostTripBooking])); // post-trip rows
    mockFrom.mockReturnValueOnce(chainedQuery(null)); // update followups_sent
    mockSendEmail.mockResolvedValue(undefined);

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    // 3 post-trip follow-up types are all due for a past end date
    expect(body.sent).toBe(3);
    expect(body.errors).toBe(0);
    expect(mockSendEmail).toHaveBeenCalledTimes(3);

    const emailArg = mockSendEmail.mock.calls[0][0];
    expect(emailArg.to[0].email).toBe("returned@example.com");
    expect(emailArg.subject).toContain("Amara Banda");
  });

  it("skips bookings without a client email", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([{ ...basePreTripBooking, client_email: null }]));
    mockFrom.mockReturnValueOnce(chainedQuery([]));

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns sent 0 when no bookings are eligible", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([])); // pre-trip
    mockFrom.mockReturnValueOnce(chainedQuery([])); // post-trip

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not let a single email failure abort the batch", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([basePreTripBooking, basePreTripBooking]));
    mockFrom.mockReturnValueOnce(chainedQuery([]));
    // Only the successful booking gets its reminders_sent updated
    mockFrom.mockReturnValueOnce(chainedQuery(null));
    mockSendEmail
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockResolvedValue(undefined);

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    // First booking: all 5 sends fail → 5 errors. Second: all 5 succeed → 5 sent.
    expect(body.sent).toBe(5);
    expect(body.errors).toBe(5);
    expect(mockSendEmail).toHaveBeenCalledTimes(10);
  });

  it("returns 500 when the pre-trip query fails", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery(null, { error: new Error("db down") }));

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(500);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});