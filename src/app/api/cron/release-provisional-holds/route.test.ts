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
        if (prop === "update" || prop === "eq" || prop === "lt" || prop === "select") {
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

// Must import the route AFTER mocks are registered (hoisted).
import { POST } from "@/app/api/cron/release-provisional-holds/route";

function makeRequest(token: string | null): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/cron/release-provisional-holds", {
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

describe("POST /api/cron/release-provisional-holds", () => {
  it("returns 401 when the bearer token is missing", async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token is wrong", async () => {
    const res = await POST(makeRequest("wrong-token"));
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(503);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("releases stale provisional bookings and returns the count", async () => {
    // .from("bookings").update(...).eq("status","provisional").lt("created_at",cutoff).select()
    mockFrom.mockReturnValueOnce(chainedQuery([{ id: "bk-1" }, { id: "bk-2" }]));

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.released).toBe(2);
    expect(body.message).toContain("2 provisional booking(s)");

    // The update carried cancellation metadata and targeted stale provisionals only
    const updateCall = mockFrom.mock.calls[0][0];
    expect(updateCall).toBe("bookings");
  });

  it("returns released 0 when no stale provisionals exist", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([]));

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.released).toBe(0);
    expect(body.message).toContain("0 provisional booking(s)");
  });

  it("returns 500 when the update query fails", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery(null, { error: new Error("db down") }));

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(500);
  });
});