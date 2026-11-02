/**
 * POST /api/admin/guest-portal/backfill
 *
 * The backfill walks the guest addresses on `bookings` and asks the real
 * provisioning helper to make sure each one has an auth user. The helper is
 * NOT mocked here: the fake Supabase admin client answers `auth.admin`
 * exactly as Supabase does, so the route, the helper and the summary are
 * exercised together. Nothing here touches the network.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────
/** Shared, mutable state of the fake Supabase project. */
const state = vi.hoisted(() => ({
  /** The `bookings` rows the fake table returns, in table order. */
  bookingRows: [] as Record<string, unknown>[],
  /** The auth users that already exist. */
  authUsers: [] as { email: string }[],
  /** The auth users created during the run. */
  createdUsers: [] as { email: string }[],
  /** How many times the helper asked Supabase for the user list. */
  listUsersCalls: 0,
  /** The 1-based listUsers call that must fail (null = none). */
  failingListUsersCall: null as number | null,
  /** The error the `bookings` query answers with (null = the query works). */
  bookingsError: null as { message: string } | null,
  /** Every table the route touched. */
  fromCalls: [] as string[],
  /** The shape of every `bookings` query the route made. */
  bookingQueries: [] as {
    filters: string[];
    orders: string[];
    range: [number, number] | null;
  }[],
}));

/**
 * The fake admin client.
 *
 * `auth.admin` behaves like Supabase's (a page of users, a create that adds
 * one), and `from("bookings")` is a chainable query that records the filters,
 * the ordering and the page range the route asked for. There is no delete,
 * update or deactivate surface at all: a route that tried to remove anything
 * would blow up instead of quietly succeeding.
 */
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        listUsers: async () => {
          state.listUsersCalls += 1;
          if (state.failingListUsersCall === state.listUsersCalls) {
            return { data: { users: [] }, error: { message: "auth list unavailable" } };
          }
          return {
            data: { users: state.authUsers.map((user) => ({ email: user.email })) },
            error: null,
          };
        },
        createUser: async (attributes: { email: string }) => {
          state.createdUsers.push({ email: attributes.email });
          state.authUsers.push({ email: attributes.email });
          return { data: { user: { id: `user-${state.createdUsers.length}` } }, error: null };
        },
      },
    },
    from: (table: string) => {
      state.fromCalls.push(table);
      if (table !== "bookings") {
        throw new Error(`unexpected table ${table}`);
      }
      const query = {
        filters: [] as string[],
        orders: [] as string[],
        range: null as [number, number] | null,
      };
      state.bookingQueries.push(query);
      const chainable = (): unknown =>
        new Proxy({} as object, {
          get(_target, prop) {
            if (prop === "then") {
              const from = query.range ? query.range[0] : 0;
              const to = query.range ? query.range[1] : state.bookingRows.length - 1;
              const result = state.bookingsError
                ? { data: null, error: state.bookingsError }
                : { data: state.bookingRows.slice(from, to + 1), error: null };
              return (resolve: (v: unknown) => void) => resolve(result);
            }
            if (prop === "select") return () => chainable();
            if (prop === "not") {
              return (column: string, operator: string, value: unknown) => {
                query.filters.push(`${column} ${operator} ${String(value)}`);
                return chainable();
              };
            }
            if (prop === "order") {
              return (column: string, options?: { ascending?: boolean }) => {
                query.orders.push(`${column}:${options?.ascending === false ? "desc" : "asc"}`);
                return chainable();
              };
            }
            if (prop === "range") {
              return (from: number, to: number) => {
                query.range = [from, to];
                return chainable();
              };
            }
            return undefined;
          },
        });
      return chainable();
    },
  }),
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

import { POST } from "@/app/api/admin/guest-portal/backfill/route";
import { AdminAuthError } from "@/lib/admin-auth";
import { ensureGuestAuthUser, resetGuestAuthProvisionBudget } from "@/lib/guest-auth-provision";

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/guest-portal/backfill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** The addresses the run created, in order. */
function createdEmails(): string[] {
  return state.createdUsers.map((user) => user.email);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.bookingRows = [];
  state.authUsers = [];
  state.createdUsers = [];
  state.listUsersCalls = 0;
  state.failingListUsersCall = null;
  state.bookingsError = null;
  state.fromCalls = [];
  state.bookingQueries = [];
  mockRequireAdmin.mockResolvedValue({ profile: { id: ADMIN_ID } });
  mockAuditLog.mockResolvedValue(undefined);
  // The helper's creation budget is module state; every test starts clean.
  resetGuestAuthProvisionBudget();
  // The helper logs its failures; keep the test output readable.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/admin/guest-portal/backfill", () => {
  it("provisions every distinct booking address and reports the summary", async () => {
    // Two bookings belong to the same guest, spelled differently.
    state.bookingRows = [
      { client_email: "Guest@Example.com" },
      { client_email: "guest@example.com" },
      { client_email: "second@example.com" },
      { client_email: "third@example.com" },
    ];
    state.authUsers = [{ email: "second@example.com" }];

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      attempted: 3,
      created: 2,
      skipped: 1,
      failed: 0,
      failures: [],
      hasMore: false,
    });
    // The address that already had a user was left alone.
    expect(createdEmails()).toEqual(["guest@example.com", "third@example.com"]);
  });

  // The response shape is the contract with the admin settings UI (todo 7).
  it("answers with exactly the agreed keys", async () => {
    state.bookingRows = [{ client_email: "guest@example.com" }];

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(Object.keys(body).sort()).toEqual([
      "attempted",
      "created",
      "failed",
      "failures",
      "hasMore",
      "skipped",
    ]);
  });

  // The route reads the bookings table and creates auth users. It must never
  // write to a booking row, and it has no delete surface at all.
  it("only ever reads the bookings table", async () => {
    state.bookingRows = [{ client_email: "guest@example.com" }];

    await POST(makeRequest());

    expect(state.fromCalls).toEqual(["bookings"]);
  });

  it("returns 401 when there is no admin session", async () => {
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Unauthorized : no valid session", 401));

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(state.createdUsers).toHaveLength(0);
    expect(state.fromCalls).toHaveLength(0);
  });

  // The guard answers 403 for a caller who is signed in but not an admin of
  // the "users" module; the route passes that status through unchanged.
  it("refuses a caller whose role is below admin", async () => {
    mockRequireAdmin.mockRejectedValue(
      new AdminAuthError("Forbidden : requires admin access to this module", 403)
    );

    const res = await POST(makeRequest());

    expect(res.status).toBe(403);
    expect(state.createdUsers).toHaveLength(0);
    expect(state.fromCalls).toHaveLength(0);
  });

  it("reads the addresses oldest booking first", async () => {
    state.bookingRows = [{ client_email: "guest@example.com" }];

    await POST(makeRequest());

    const query = state.bookingQueries[0];
    expect(query.orders).toEqual(["created_at:asc", "id:asc"]);
    expect(query.filters).toContain("client_email is null");
  });

  it("ignores a booking row without a usable address", async () => {
    state.bookingRows = [
      { client_email: null },
      { client_email: "   " },
      { client_email: "guest@example.com" },
    ];

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.attempted).toBe(1);
    expect(body.created).toBe(1);
  });

  // One address that cannot be read must not take the run down with it.
  it("lists an address whose user lookup fails and keeps processing the others", async () => {
    state.bookingRows = [
      { client_email: "first@example.com" },
      { client_email: "second@example.com" },
      { client_email: "third@example.com" },
    ];
    // The helper looks an address up once, in address order, so the second
    // lookup is the one that fails.
    state.failingListUsersCall = 2;

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.attempted).toBe(3);
    expect(body.created).toBe(2);
    expect(body.failed).toBe(1);
    expect(body.failures).toEqual([
      { email: "second@example.com", reason: "auth list unavailable" },
    ]);
    expect(createdEmails()).toEqual(["first@example.com", "third@example.com"]);
  });

  // A capped address was NOT provisioned. The summary has no bucket for the
  // cap, so it is counted as a failure carrying the reason "creation_cap":
  // visible, and re-runnable once the window has rolled.
  it("counts a capped address as failed so it stays visible and re-runnable", async () => {
    // Exhaust the helper's creation budget: 50 creations per 60 second window.
    for (let i = 0; i < 50; i++) {
      await ensureGuestAuthUser(`seed${i}@example.com`);
    }
    state.bookingRows = [{ client_email: "guest@example.com" }];

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.created).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.failures).toEqual([{ email: "guest@example.com", reason: "creation_cap" }]);
    // Only the seeding run created anything.
    expect(state.createdUsers).toHaveLength(50);
  });

  it("stops at 500 addresses and says that more remain", async () => {
    const addresses = Array.from({ length: 501 }, (_, i) => `guest${i}@example.com`);
    state.bookingRows = addresses.map((email) => ({ client_email: email }));
    // Every address already has a user, so no creation budget is spent.
    state.authUsers = addresses.map((email) => ({ email }));

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.attempted).toBe(500);
    expect(body.skipped).toBe(500);
    expect(body.created).toBe(0);
    expect(body.hasMore).toBe(true);
  });

  // The batch order is stable, so an operator can walk a longer address list
  // in consecutive batches.
  it("runs the batch after the requested offset", async () => {
    state.bookingRows = [
      { client_email: "first@example.com" },
      { client_email: "second@example.com" },
      { client_email: "third@example.com" },
    ];

    const res = await POST(makeRequest({ offset: 1 }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.attempted).toBe(2);
    expect(createdEmails()).toEqual(["second@example.com", "third@example.com"]);
  });

  it("runs the first batch when the body is not JSON", async () => {
    state.bookingRows = [{ client_email: "guest@example.com" }];
    const request = new NextRequest("http://localhost/api/admin/guest-portal/backfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const res = await POST(request);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.attempted).toBe(1);
    expect(body.created).toBe(1);
  });

  it("audits the run", async () => {
    state.bookingRows = [{ client_email: "guest@example.com" }];

    await POST(makeRequest());

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tableName: "guest_portal_backfill",
        action: "CREATE",
        performedBy: ADMIN_ID,
        newData: expect.objectContaining({
          attempted: 1,
          created: 1,
          skipped: 0,
          failed: 0,
          has_more: false,
        }),
      })
    );
  });

  it("returns 500 when the booking addresses cannot be read", async () => {
    state.bookingsError = { message: "db down" };

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    expect(state.createdUsers).toHaveLength(0);
  });

  it("reports an empty run without inventing any work", async () => {
    state.bookingRows = [];

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      attempted: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      failures: [],
      hasMore: false,
    });
    expect(state.createdUsers).toHaveLength(0);
  });
});
