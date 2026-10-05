import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────
/**
 * `sendEmail` and the table mock share one ordered log so a test can assert the
 * SEQUENCE of claim → send → confirm, not just the final state. Ordering is the
 * whole safety property here: a route that sent before claiming could double-send.
 */
const callLog: string[] = [];

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// The REAL AdminAuthError class is preserved so `instanceof` narrowing works.
const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin-auth")>();
  return { ...actual, requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args) };
});

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
        throw new MockActionBlockedError("AI outbound messages are switched off.", {
          allowed: false,
          companyLevel: 2,
          blockedBySwitch: "governance.ai_outbound_messages_enabled",
          authorizedBy: "switch",
          humanAuthorized: false,
          decision: {
            allowed: false,
            requiresHumanReview: true,
            requiredLevel: 3,
            effectiveLevel: 2,
            reason: "AI outbound messages are switched off.",
            escalatedBy: ["exceeds_company_autonomy_level"],
          },
        });
      }
      return { allowed: true, humanAuthorized: true, staged: true };
    }),
    ActionBlockedError: MockActionBlockedError,
    actionBlockedResponse: (error: { message: string }) =>
      new Response(JSON.stringify({ error: error.message }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
  };
});

const mockAuditLog = vi.fn();
vi.mock("@/lib/audit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/audit")>();
  return { ...actual, createAuditLog: (entry: unknown) => mockAuditLog(entry) };
});

const mockRecordEvent = vi.fn();
vi.mock("@/lib/ai/event-bus", () => ({
  recordEvent: (event: unknown) => mockRecordEvent(event),
}));

import { POST } from "@/app/api/admin/staged-reminders/dispatch/route";
import { AdminAuthError } from "@/lib/admin-auth";

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ROW_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SECOND_ROW_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const BOOKING_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

interface RowOptions {
  id?: string;
  reviewed_by?: string | null;
  kind?: string;
  message_type?: string;
}

/** An approved row, i.e. one a named human already signed off. */
function approvedRow(options: RowOptions = {}): Record<string, unknown> {
  return {
    id: options.id ?? ROW_ID,
    booking_id: BOOKING_ID,
    booking_reference: "TRP-0101",
    kind: options.kind ?? "reminder",
    message_type: options.message_type ?? "n7",
    recipient_email: "guest@example.com",
    recipient_name: "Martinez Kaponda",
    subject: "7 days to go",
    body_html: "<p>Your lodge is confirmed.</p>",
    reviewed_by: options.reviewed_by === undefined ? ADMIN_ID : options.reviewed_by,
    reviewed_at: "2026-10-01T10:00:00Z",
  };
}

/** Result of the `approved` queue listing. */
let listResult: { data: unknown; error: unknown };
/**
 * Results for staged_reminders writes, keyed by the status the write SETS.
 * A write whose key is absent resolves to "1 row matched" — the ordinary success
 * case. Scripting `dispatching: { data: [] }` simulates losing a claim race.
 */
let writeResults: Record<string, { data: unknown; error: unknown }>;
/** Every staged_reminders payload written, in order. */
let stagedWrites: Record<string, unknown>[];
/** Every status predicate applied to a staged_reminders query, in order. */
let statusFilters: string[];
/** The booking's sent ledgers, as real arrays so a lost append is observable. */
let bookingLedger: Record<string, unknown[]>;

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/staged-reminders/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** The status a staged_reminders write sets, as a string key. */
function writeStatus(payload: Record<string, unknown>): string {
  return typeof payload.status === "string" ? payload.status : "none";
}

/** Records a call in the shared ordering log. */
function log(entry: string): void {
  callLog.push(entry);
}

/**
 * `staged_reminders`: reads resolve to the scripted queue; writes record their
 * payload and resolve from `writeResults`.
 */
function stagedTable(): unknown {
  const chainable = (result: { data: unknown; error: unknown }): unknown =>
    new Proxy({} as object, {
      get(_target, prop) {
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
        if (
          prop === "select" ||
          prop === "single" ||
          prop === "order" ||
          prop === "limit" ||
          prop === "eq" ||
          prop === "in" ||
          prop === "lt"
        ) {
          if (prop === "eq" || prop === "in") {
            return (column: string, value: unknown) => {
              if (column === "status") {
                for (const v of Array.isArray(value) ? value : [value]) {
                  if (typeof v === "string") statusFilters.push(v);
                }
              }
              return chainable(result);
            };
          }
          return () => chainable(result);
        }
        if (prop === "update") {
          return (payload: Record<string, unknown>) => {
            const status = writeStatus(payload);
            stagedWrites.push(payload);
            log(`update:${status}`);
            return chainable(writeResults[status] ?? { data: [{ id: ROW_ID }], error: null });
          };
        }
        return undefined;
      },
    });

  return chainable(listResult);
}

/**
 * `bookings`: the sent ledger is a real array, so the route's read → append →
 * verify loop can be observed rather than assumed. Selecting both columns in one
 * call returns both; selecting one returns just that one.
 */
function bookingsTable(): unknown {
  const chainable = (columns: string[], result: { data: unknown; error: unknown }): unknown =>
    new Proxy({} as object, {
      get(_target, prop) {
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
        if (prop === "single" || prop === "eq") return () => chainable(columns, result);
        if (prop === "select") {
          return (selected: string) => {
            const wanted = selected === "*" ? ["reminders_sent", "followups_sent"] : [selected];
            const data: Record<string, unknown> = {};
            for (const column of wanted) data[column] = bookingLedger[column] ?? [];
            return chainable(wanted, { data, error: null });
          };
        }
        if (prop === "update") {
          return (payload: Record<string, unknown>) => {
            const column = "reminders_sent" in payload ? "reminders_sent" : "followups_sent";
            const next = payload[column];
            if (Array.isArray(next)) bookingLedger[column] = next;
            log(`ledger:${column}`);
            return chainable(columns, { data: null, error: null });
          };
        }
        return undefined;
      },
    });

  return chainable([], { data: {}, error: null });
}

function installMock(): void {
  mockFrom.mockImplementation((tableName: string) => {
    if (tableName === "staged_reminders") return stagedTable();
    if (tableName === "bookings") return bookingsTable();
    throw new Error(`unexpected table ${tableName}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  callLog.length = 0;
  stagedWrites = [];
  statusFilters = [];
  gateState.blocked = false;
  mockRequireAdmin.mockResolvedValue({ profile: { id: ADMIN_ID } });
  mockAuditLog.mockResolvedValue(undefined);
  mockRecordEvent.mockResolvedValue({ success: true });
  mockSendEmail.mockImplementation(async () => {
    log("send");
    return { success: true, messageId: "<abc@example.com>" };
  });
  listResult = { data: [approvedRow()], error: null };
  writeResults = {};
  bookingLedger = { reminders_sent: [], followups_sent: [] };
  installMock();
});

describe("POST /api/admin/staged-reminders/dispatch", () => {
  it("refuses a caller who is not an admin of this module", async () => {
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Forbidden", 403));

    const res = await POST(makeRequest());

    expect(res.status).toBe(403);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no session", async () => {
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Unauthorized", 401));

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
  });

  // An operator who has switched off AI outbound must stop the send, and the
  // refusal has to land before any row is read.
  it("sends nothing when the gate refuses", async () => {
    gateState.blocked = true;

    const res = await POST(makeRequest());

    expect(res.status).toBe(503);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("does nothing at all when the queue is empty", async () => {
    listResult = { data: [], error: null };

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.dispatched).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    // An empty run must not manufacture an audit entry either.
    expect(mockAuditLog).not.toHaveBeenCalled();
  });

  // Dispatch must not re-derive the message: what the admin read is what goes
  // out, byte for byte.
  it("sends the exact reviewed body", async () => {
    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.dispatched).toBe(1);

    const arg = mockSendEmail.mock.calls[0][0] as {
      to: { email: string }[];
      subject: string;
      htmlContent: string;
    };
    expect(arg.htmlContent).toBe("<p>Your lodge is confirmed.</p>");
    expect(arg.subject).toBe("7 days to go");
    expect(arg.to[0].email).toBe("guest@example.com");
  });

  // Claim-before-send is what makes two admins clicking "send" at the same moment
  // safe. Sending first and marking afterwards cannot prevent the duplicate.
  it("claims the row before handing it to the provider", async () => {
    await POST(makeRequest());

    const claimIndex = callLog.indexOf("update:dispatching");
    const sendIndex = callLog.indexOf("send");
    expect(claimIndex).toBeGreaterThanOrEqual(0);
    expect(sendIndex).toBeGreaterThan(claimIndex);
  });

  it("confirms the row only after the provider accepted it", async () => {
    await POST(makeRequest());

    expect(callLog.indexOf("update:dispatched")).toBeGreaterThan(callLog.indexOf("send"));
  });

  it("only ever sends rows that were approved", async () => {
    await POST(makeRequest());

    expect(statusFilters).toContain("approved");
    expect(statusFilters).not.toContain("pending");
  });

  // The `humanAuthorized` claim this route makes is only true if a named human
  // signed off. A row without one cannot justify it.
  it("does not send an approval with no reviewer on it", async () => {
    listResult = { data: [approvedRow({ reviewed_by: null })], error: null };

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.dispatched).toBe(0);
    expect(body.failed).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(stagedWrites.some((w) => w.status === "failed")).toBe(true);
  });

  it("skips a row it lost the claim on instead of double-sending", async () => {
    // The claim update matches no rows: a concurrent dispatch got there first.
    writeResults = { dispatching: { data: [], error: null } };

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.dispatched).toBe(0);
    // The send never happened, so nothing is reported as a failure either.
    expect(body.failed).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockAuditLog).not.toHaveBeenCalled();
  });

  it("marks a delivered row dispatched with the provider message id", async () => {
    await POST(makeRequest());

    const confirm = stagedWrites.find((w) => w.status === "dispatched");
    expect(confirm).toBeDefined();
    expect(confirm?.message_id).toBe("<abc@example.com>");
    expect(confirm?.dispatched_at).toEqual(expect.any(String));
    expect(confirm?.dispatch_error).toBeNull();
  });

  it("records the send in the booking's own sent ledger", async () => {
    await POST(makeRequest());

    expect(bookingLedger.reminders_sent).toEqual([{ type: "n7", sentAt: expect.any(String) }]);
    expect(bookingLedger.followups_sent).toEqual([]);
  });

  it("uses the follow-up column for a follow-up row", async () => {
    listResult = {
      data: [approvedRow({ kind: "followup", message_type: "d7" })],
      error: null,
    };

    await POST(makeRequest());

    expect(bookingLedger.followups_sent).toEqual([{ type: "d7", sentAt: expect.any(String) }]);
    expect(bookingLedger.reminders_sent).toEqual([]);
  });

  it("emits a delivery event naming the approver", async () => {
    await POST(makeRequest());

    expect(mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "booking",
        entityId: BOOKING_ID,
        payload: expect.objectContaining({
          staged_reminder_id: ROW_ID,
          approved_by: ADMIN_ID,
          message_type: "n7",
        }),
      })
    );
  });

  // Resetting a failure to `approved` would let a retry re-send a message whose
  // outcome is unknown.
  it("leaves a provider failure retryable rather than approved again", async () => {
    mockSendEmail.mockRejectedValue(new Error("smtp down"));

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.dispatched).toBe(0);
    expect(body.failed).toBe(1);

    // The stale-claim sweep also writes `failed` rows first, so the send failure
    // is the last one written.
    const failure = stagedWrites.filter((w) => w.status === "failed").at(-1);
    expect(failure?.dispatch_error).toBe("smtp down");
    // The claim is released, so the row is not left looking mid-send.
    expect(failure?.dispatching_at).toBeNull();
    expect(failure?.status).not.toBe("approved");
    // A failed send must never be recorded as delivered.
    expect(bookingLedger.reminders_sent).toEqual([]);
  });

  // A batch that aborted on the first error would leave the queue ambiguous:
  // some guests contacted, some not, with no record of which.
  it("keeps going after one row fails", async () => {
    listResult = {
      data: [approvedRow(), approvedRow({ id: SECOND_ROW_ID, message_type: "n1" })],
      error: null,
    };
    mockSendEmail
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockImplementationOnce(async () => {
        log("send");
        return { success: true, messageId: "<second@example.com>" };
      });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.dispatched).toBe(1);
    expect(body.failed).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("audits the batch with both counts", async () => {
    await POST(makeRequest());

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tableName: "staged_reminders",
        action: "CAMPAIGN_SEND",
        performedBy: ADMIN_ID,
        newData: expect.objectContaining({ dispatched_count: 1, failed_count: 0 }),
      })
    );
  });

  it("returns 500 when the approved queue cannot be read", async () => {
    listResult = { data: null, error: new Error("db down") };

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // A row stuck in `dispatching` means a previous process died mid-send. Whether
  // the guest was contacted is unknowable, so it is handed back as failed for a
  // human rather than auto-resent.
  it("reclaims an abandoned claim as failed instead of resending it", async () => {
    await POST(makeRequest());

    expect(statusFilters).toContain("dispatching");
    const reclaim = stagedWrites.find(
      (w) => w.status === "failed" && String(w.dispatch_error).includes("interrupted")
    );
    expect(reclaim).toBeDefined();
    expect(reclaim?.dispatching_at).toBeNull();
  });

  it("sends a single row when asked by id", async () => {
    listResult = { data: [approvedRow()], error: null };

    await POST(makeRequest({ id: ROW_ID }));

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  // An empty or non-JSON body must not break a curl/cron-triggered dispatch.
  it("treats a non-JSON body as send-the-whole-queue", async () => {
    const request = new NextRequest("http://localhost/api/admin/staged-reminders/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const res = await POST(request);

    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });
});