import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

// The REAL AdminAuthError class is preserved so `instanceof` narrowing in the
// route still works; only the guard is stubbed.
const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin-auth")>();
  return { ...actual, requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args) };
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

import { GET, PATCH } from "@/app/api/admin/staged-reminders/route";
import { AdminAuthError } from "@/lib/admin-auth";

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STAGED_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const BOOKING_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

/** Result of the `.select(...).eq("id").single()` row read. */
let readResult: { data: unknown; error: unknown };
/** Result of the `.update(...).eq(...).in(...).select("id")` compare-and-swap. */
let casResult: { data: unknown; error: unknown };
/** Result of the GET listing query. */
let listResult: { data: unknown; error: unknown };
/** Every `staged_reminders` row payload the route tried to write. */
let stagedWrites: Record<string, unknown>[];
/** Every status predicate applied, so the CAS can be asserted rather than assumed. */
let statusFilters: string[];

function makeRequest(
  body?: unknown,
  url = "http://localhost/api/admin/staged-reminders"
): NextRequest {
  return new NextRequest(url, {
    method: body === undefined ? "GET" : "PATCH",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/**
 * A table client that resolves to a scripted result chosen by the SHAPE of the
 * query rather than by call order, so the mock stays correct regardless of how
 * many queries a handler issues:
 *
 *   update(...) present   → the compare-and-swap
 *   .single() present     → the single-row read
 *   otherwise             → the GET listing
 *
 * `update` records its payload so tests can assert what the handler tried to
 * write, and status predicates are captured so the CAS can be asserted rather
 * than assumed.
 */
function table(): unknown {
  // Per-chain flags: each `from()` gets a fresh chain, so these cannot leak
  // between the read, the write and the listing.
  let sawUpdate = false;
  let sawSingle = false;

  const chainable = (): unknown =>
    new Proxy({} as object, {
      get(_target, prop) {
        if (prop === "then") {
          const result = sawUpdate ? casResult : sawSingle ? readResult : listResult;
          return (resolve: (v: unknown) => void) => resolve(result);
        }
        if (prop === "single") {
          sawSingle = true;
          return () => chainable();
        }
        if (prop === "select" || prop === "order" || prop === "limit") {
          return () => chainable();
        }
        if (prop === "eq" || prop === "in") {
          return (column: string, value: unknown) => {
            if (column === "status") {
              for (const v of Array.isArray(value) ? value : [value]) {
                if (typeof v === "string") statusFilters.push(v);
              }
            }
            return chainable();
          };
        }
        if (prop === "update") {
          return (payload: Record<string, unknown>) => {
            sawUpdate = true;
            stagedWrites.push(payload);
            return chainable();
          };
        }
        return undefined;
      },
    });

  return chainable();
}

function installMock(): void {
  mockFrom.mockImplementation(() => table());
}

beforeEach(() => {
  vi.clearAllMocks();
  stagedWrites = [];
  statusFilters = [];
  mockRequireAdmin.mockResolvedValue({ profile: { id: ADMIN_ID } });
  mockAuditLog.mockResolvedValue(undefined);
  mockRecordEvent.mockResolvedValue({ success: true });
  installMock();
  readResult = {
    data: {
      id: STAGED_ID,
      status: "pending",
      subject: "Your journey to South Luangwa is 7 days away",
      recipient_email: "guest@example.com",
      kind: "reminder",
      message_type: "n7",
    },
    error: null,
  };
  casResult = { data: [{ id: STAGED_ID }], error: null };
  listResult = { data: [], error: null };
});

describe("GET /api/admin/staged-reminders", () => {
  it("refuses a caller who is not an admin of this module", async () => {
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Forbidden", 403));

    const res = await GET(makeRequest());

    expect(res.status).toBe(403);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no session", async () => {
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Unauthorized", 401));

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });

  it("defaults to the pending review queue", async () => {
    listResult = {
      data: [
        {
          id: STAGED_ID,
          booking_id: BOOKING_ID,
          booking_reference: "TRP-0101",
          kind: "reminder",
          message_type: "n7",
          recipient_email: "guest@example.com",
          recipient_name: "Martinez Kaponda",
          subject: "7 days to go",
          body_html: "<p>Hello</p>",
          status: "pending",
          created_at: "2026-10-01T09:00:00Z",
          reviewed_at: null,
          review_note: null,
        },
      ],
      error: null,
    };

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(statusFilters).toContain("pending");
    expect(body.scope).toBe("pending");
    expect(body.pendingCount).toBe(1);
    // The reviewer needs the exact rendered body: the artifact they approve is
    // the artifact dispatch will send.
    expect(body.reminders[0].bodyHtml).toBe("<p>Hello</p>");
    expect(body.reminders[0].recipientEmail).toBe("guest@example.com");
    // Columns are camelCased for the client.
    expect(body.reminders[0].messageType).toBe("n7");
    expect(body.reminders[0].bookingId).toBe(BOOKING_ID);
  });

  it("drops the status filter entirely when asked for all history", async () => {
    const res = await GET(
      makeRequest(undefined, "http://localhost/api/admin/staged-reminders?status=all")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(statusFilters).toHaveLength(0);
    expect(body.scope).toBe("all");
  });

  it("returns 500 when the listing query fails", async () => {
    listResult = { data: null, error: new Error("db down") };

    const res = await GET(makeRequest());

    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/admin/staged-reminders", () => {
  it("refuses a caller who is not an admin of this module", async () => {
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Forbidden", 403));

    const res = await PATCH(makeRequest({ id: STAGED_ID, outcome: "approved" }));

    expect(res.status).toBe(403);
    expect(stagedWrites).toHaveLength(0);
  });

  it("requires a valid uuid", async () => {
    const res = await PATCH(makeRequest({ id: "not-a-uuid", outcome: "approved" }));

    expect(res.status).toBe(400);
    expect(stagedWrites).toHaveLength(0);
  });

  it("rejects an outcome outside approve/reject", async () => {
    const res = await PATCH(makeRequest({ id: STAGED_ID, outcome: "dispatched" }));

    expect(res.status).toBe(400);
    expect(stagedWrites).toHaveLength(0);
  });

  it("records the approving admin and an approval event", async () => {
    const res = await PATCH(
      makeRequest({ id: STAGED_ID, outcome: "approved", note: "  looks right  " })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("approved");

    const write = stagedWrites[0];
    expect(write.status).toBe("approved");
    // `reviewed_by` is what makes the later dispatch a truthful humanAuthorized
    // claim, so it must be the caller's own profile id.
    expect(write.reviewed_by).toBe(ADMIN_ID);
    expect(write.reviewed_at).toEqual(expect.any(String));
    expect(write.review_note).toBe("looks right");

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ recordId: STAGED_ID, performedBy: ADMIN_ID })
    );
    // An approval that emitted no event would be invisible to Mission Control.
    expect(mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "OUTBOUND_STAGED_APPROVED",
        entityType: "staged_reminder",
        entityId: STAGED_ID,
        actorType: "human",
        actorId: ADMIN_ID,
      })
    );
  });

  it("records a rejection as a distinct outcome", async () => {
    const res = await PATCH(
      makeRequest({ id: STAGED_ID, outcome: "rejected", note: "wrong travel date" })
    );

    expect(res.status).toBe(200);
    expect(stagedWrites[0].status).toBe("rejected");
    expect(mockRecordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "OUTBOUND_STAGED_REJECTED" })
    );
  });

  // Two operators loading the same item would both see `pending`; without the
  // status predicate on the write, the second decision would silently overwrite
  // the first while the audit log records one human having acted.
  it("loses the compare-and-swap when someone else reviewed first", async () => {
    casResult = { data: [], error: null };

    const res = await PATCH(makeRequest({ id: STAGED_ID, outcome: "approved" }));

    expect(res.status).toBe(409);
    expect(mockAuditLog).not.toHaveBeenCalled();
    expect(mockRecordEvent).not.toHaveBeenCalled();
  });

  it("constrains the write to pending rows", async () => {
    await PATCH(makeRequest({ id: STAGED_ID, outcome: "approved" }));

    expect(statusFilters).toContain("pending");
  });

  it("refuses to re-review a row that is no longer pending", async () => {
    readResult = {
      data: { ...(readResult.data as Record<string, unknown>), status: "dispatched" },
      error: null,
    };

    const res = await PATCH(makeRequest({ id: STAGED_ID, outcome: "approved" }));

    expect(res.status).toBe(409);
    expect(stagedWrites).toHaveLength(0);
  });

  it("returns 404 when the row does not exist", async () => {
    readResult = { data: null, error: new Error("PGRST116") };

    const res = await PATCH(makeRequest({ id: STAGED_ID, outcome: "approved" }));

    expect(res.status).toBe(404);
    expect(stagedWrites).toHaveLength(0);
  });

  it("returns 500 when the write fails", async () => {
    casResult = { data: null, error: new Error("db down") };

    const res = await PATCH(makeRequest({ id: STAGED_ID, outcome: "approved" }));

    expect(res.status).toBe(500);
  });

  // Approving authorizes a real email to a real guest, so it must not be
  // reachable without a session.
  it("does not approve anything on an unauthenticated request", async () => {
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Unauthorized", 401));

    const res = await PATCH(makeRequest({ id: STAGED_ID, outcome: "approved" }));

    expect(res.status).toBe(401);
    expect(stagedWrites).toHaveLength(0);
  });
});