import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────
type Settle = { data: unknown; error: unknown };

// `sendEmail` is mocked so that ANY call to it is a failure in this file. The
// constitutional claim under test is that an unattended cron never contacts a
// guest, so every case here asserts the absence of a send.
const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockInsert = vi.fn();
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// The gate is mocked so this file keeps covering staging behaviour rather than
// the constitution. The refusal path is asserted at the bottom with
// `gateState.blocked` flipped on.
const gateState = vi.hoisted(() => ({ blocked: false }));

vi.mock("@/lib/ai/action-gate", () => {
  class MockActionBlockedError extends Error {
    readonly status = 403;
    readonly result: unknown;
    constructor(message: string, result: unknown) {
      super(message);
      this.name = "ActionBlockedError";
      this.result = result;
    }
  }

  return {
    gateAiAction: vi.fn(async () => {
      if (gateState.blocked) {
        throw new MockActionBlockedError("AI internal writes are switched off.", {
          allowed: false,
          companyLevel: 2,
          blockedBySwitch: "governance.ai_internal_writes_enabled",
          authorizedBy: "switch",
          humanAuthorized: false,
          decision: {
            allowed: false,
            requiresHumanReview: true,
            requiredLevel: 2,
            effectiveLevel: 2,
            reason: "AI internal writes are switched off.",
            escalatedBy: ["exceeds_company_autonomy_level"],
          },
        });
      }
      return { allowed: true };
    }),
    ActionBlockedError: MockActionBlockedError,
    // A plain `Response`, not `NextResponse`: vitest hoists mock factories above
    // the imports, so referencing the imported binding here would hit the
    // temporal dead zone and fail at call time rather than at load time.
    actionBlockedResponse: (error: { message: string }) =>
      new Response(JSON.stringify({ error: error.message }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
  };
});

// Must import the route AFTER mocks are registered (hoisted).
import { POST } from "@/app/api/ai/trigger-reminders/route";

// A confirmed booking whose start date is 7 days out. The engine's rule is
// `due <= now`, so n30, n14 and n7 are due while n1 and day-of are not — three
// messages, which keeps the expected counts unambiguous.
const dueSoonBooking = {
  id: "11111111-1111-4111-8111-111111111111",
  booking_reference: "TRP-0101",
  client_name: "Martinez Kaponda",
  client_email: "guest@example.com",
  destination: "South Luangwa",
  start_date: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })(),
  reminders_sent: null,
};

/** Pre-trip reminder types due for {@link dueSoonBooking}: n30, n14, n7. */
const DUE_SOON_COUNT = 3;

// A completed booking that ended well in the past, so all three follow-ups
// (d1, d7, d30) are due.
const postTripBooking = {
  id: "22222222-2222-4222-8222-222222222222",
  booking_reference: "TRP-0102",
  client_name: "Amara Banda",
  client_email: "returned@example.com",
  destination: "Lake Malawi",
  end_date: "2026-07-01T00:00:00Z",
  followups_sent: null,
};

/** Post-trip follow-up types due for {@link postTripBooking}. */
const FOLLOWUP_COUNT = 3;

interface BookingQuery {
  rows: unknown[] | null;
  error?: unknown;
}

/** Query results handed to `bookings` reads, in call order. */
let bookingQueries: BookingQuery[];
/** Every `bookings` row payload the route tried to write. Must stay empty. */
let bookingWrites: unknown[];

function makeRequest(token: string | null): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/ai/trigger-reminders", {
    method: "POST",
    headers,
  });
}

/** The rows offered to `staged_reminders.insert`, in order. */
function insertedRows(): Record<string, unknown>[] {
  return mockInsert.mock.calls.map((c) => c[0] as Record<string, unknown>);
}

beforeEach(() => {
  vi.clearAllMocks();
  gateState.blocked = false;
  process.env.CRON_SECRET = "test-secret";
  mockInsert.mockResolvedValue({ data: null, error: null });
  bookingQueries = [{ rows: [] }, { rows: [] }];
  bookingWrites = [];

  // Dispatch on table name rather than call order: the route reads `bookings`
  // twice and then writes `staged_reminders` once per message, so a call-order
  // mock would silently hand the third call `undefined`.
  let bookingQueryIndex = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === "staged_reminders") {
      // The route calls `.insert()` straight off the table client, so the mock
      // has to expose it there as well as after `.select()`.
      const tableClient = {
        select: () => tableClient,
        insert: (row: unknown) => mockInsert(row),
      };
      return tableClient;
    }
    if (table === "bookings") {
      const query = bookingQueries[bookingQueryIndex] ?? { rows: [] };
      bookingQueryIndex += 1;
      const settle: Settle = { data: query.rows, error: query.error ?? null };
      const chainable = () =>
        new Proxy({} as object, {
          get(_target, prop) {
            if (prop === "then") return (resolve: (v: unknown) => void) => resolve(settle);
            if (prop === "select" || prop === "in" || prop === "not" || prop === "eq") {
              return () => chainable();
            }
            if (prop === "update") {
              return (payload: unknown) => {
                bookingWrites.push(payload);
                return chainable();
              };
            }
            return undefined;
          },
        });
      return chainable();
    }
    throw new Error(`unexpected table ${table}`);
  });
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("POST /api/ai/trigger-reminders (stages, never sends)", () => {
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

  // The whole point of the staging split. If this regresses, the constitution is
  // being violated nightly and no other assertion in this file would notice.
  it("sends no email", async () => {
    bookingQueries = [{ rows: [dueSoonBooking] }, { rows: [postTripBooking] }];

    await POST(makeRequest("test-secret"));

    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("stages the rendered message with the exact content a guest would receive", async () => {
    bookingQueries = [{ rows: [dueSoonBooking] }, { rows: [] }];

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const rows = insertedRows();
    expect(rows).toHaveLength(DUE_SOON_COUNT);

    const row = rows[0];
    expect(row.status).toBe("pending");
    expect(row.kind).toBe("reminder");
    expect(row.booking_id).toBe(dueSoonBooking.id);
    expect(row.booking_reference).toBe(dueSoonBooking.booking_reference);
    expect(row.recipient_email).toBe(dueSoonBooking.client_email);
    expect(row.recipient_name).toBe(dueSoonBooking.client_name);
    // The reviewed artifact must be the deliverable artifact, not a summary.
    expect(typeof row.subject).toBe("string");
    expect(String(row.subject).length).toBeGreaterThan(0);
    expect(String(row.body_html).length).toBeGreaterThan(0);
    expect(String(row.body_html)).toContain("TRP-0101");
    // Nothing about delivery belongs on a staged row.
    expect(row.dispatched_at).toBeUndefined();
    expect(row.message_id).toBeUndefined();
    expect(row.reviewed_by).toBeUndefined();
  });

  // Recording delivery at staging time would permanently suppress a message that
  // was never sent: the guest would never be contacted and nothing would look
  // outstanding.
  it("never writes reminders_sent or followups_sent", async () => {
    bookingQueries = [{ rows: [dueSoonBooking] }, { rows: [postTripBooking] }];

    await POST(makeRequest("test-secret"));

    expect(bookingWrites).toEqual([]);
  });

  it("reports staging counts rather than send counts", async () => {
    bookingQueries = [{ rows: [dueSoonBooking] }, { rows: [] }];

    const res = await POST(makeRequest("test-secret"));
    const body = await res.json();

    // A cron log reading `sent` would be misleading: nothing was sent.
    expect(body.sent).toBeUndefined();
    expect(body.staged).toBe(DUE_SOON_COUNT);
    expect(body.errors).toBe(0);
    expect(body.awaitingReview).toBe("/admin/staged-reminders");
  });

  it("stages post-trip follow-ups as a separate kind", async () => {
    bookingQueries = [{ rows: [] }, { rows: [postTripBooking] }];

    await POST(makeRequest("test-secret"));

    const rows = insertedRows();
    expect(rows).toHaveLength(FOLLOWUP_COUNT);
    expect(rows.every((r) => r.kind === "followup")).toBe(true);
    expect(rows[0].recipient_email).toBe(postTripBooking.client_email);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("suppresses reminder types a guest already received", async () => {
    bookingQueries = [
      {
        rows: [
          { ...dueSoonBooking, reminders_sent: [{ type: "n30", sentAt: "2026-07-01T00:00:00Z" }] },
        ],
      },
      { rows: [] },
    ];

    const res = await POST(makeRequest("test-secret"));
    const body = await res.json();

    expect(body.staged).toBe(DUE_SOON_COUNT - 1);
    expect(body.skipped).toBe(1);
    expect(body.details.skipped[0].reason).toBe("already sent");
  });

  it("skips a message that already has an open staged row", async () => {
    // 23505 = unique_violation from staged_reminders_open_key. A repeat nightly
    // run is a no-op, not an error.
    mockInsert.mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate" } });
    bookingQueries = [{ rows: [dueSoonBooking] }, { rows: [] }];

    const res = await POST(makeRequest("test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.staged).toBe(0);
    expect(body.errors).toBe(0);
    expect(body.details.skipped[0].reason).toBe("already staged");
  });

  it("reports a genuine insert failure as an error", async () => {
    mockInsert.mockResolvedValue({ data: null, error: { code: "42501", message: "denied" } });
    bookingQueries = [{ rows: [dueSoonBooking] }, { rows: [] }];

    const res = await POST(makeRequest("test-secret"));
    const body = await res.json();

    expect(body.staged).toBe(0);
    expect(body.errors).toBe(DUE_SOON_COUNT);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not let one booking's failure abort the batch", async () => {
    bookingQueries = [{ rows: [dueSoonBooking, dueSoonBooking] }, { rows: [] }];
    mockInsert
      .mockResolvedValueOnce({ data: null, error: { code: "42501", message: "denied" } })
      .mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest("test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.errors).toBe(1);
    expect(body.staged).toBe(DUE_SOON_COUNT * 2 - 1);
  });

  it("skips bookings without a client email", async () => {
    bookingQueries = [{ rows: [{ ...dueSoonBooking, client_email: null }] }, { rows: [] }];

    const res = await POST(makeRequest("test-secret"));
    const body = await res.json();

    expect(body.staged).toBe(0);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns staged 0 when no bookings are eligible", async () => {
    bookingQueries = [{ rows: [] }, { rows: [] }];

    const res = await POST(makeRequest("test-secret"));
    const body = await res.json();

    expect(body.staged).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when the pre-trip query fails", async () => {
    bookingQueries = [{ rows: null, error: new Error("db down") }];

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(500);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── Governance ──────────────────────────────────────────────────────────
  // Staging is an internal write, so an operator's "AI internal writes" switch
  // stops it. The refusal must land before any query, or the route would still do
  // work on a path the constitution rejected.
  it("stages nothing when the gate refuses", async () => {
    gateState.blocked = true;

    const res = await POST(makeRequest("test-secret"));

    expect(res.status).toBe(503);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("consults no bookings at all once the gate refuses", async () => {
    gateState.blocked = true;

    await POST(makeRequest("test-secret"));

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("still authenticates before consulting the gate", async () => {
    // A refused route must not become a way to probe governance state, so the
    // 401 has to come first.
    gateState.blocked = true;

    const res = await POST(makeRequest("wrong-token"));

    expect(res.status).toBe(401);
  });
});