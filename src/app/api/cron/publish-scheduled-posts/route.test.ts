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
        if (prop === "update" || prop === "eq" || prop === "not" || prop === "lte" || prop === "select") {
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
import { POST } from "@/app/api/cron/publish-scheduled-posts/route";

function makeRequest(token: string | null): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/cron/publish-scheduled-posts", {
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

describe("POST /api/cron/publish-scheduled-posts", () => {
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

  it("publishes due scheduled posts and returns the count", async () => {
    // .from("blog_posts").update(...).eq("is_published",false).not("scheduled_at").lte(now).select(...)
    mockFrom.mockReturnValueOnce(chainedQuery([{ id: "post-1", title: "Post One" }, { id: "post-2", title: "Post Two" }]));

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.published).toBe(2);
    expect(body.message).toContain("2 scheduled post(s)");
  });

  it("returns published 0 when no posts are due", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery([]));

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.published).toBe(0);
    expect(body.message).toContain("0 scheduled post(s)");
  });

  it("returns 500 when the update query fails", async () => {
    mockFrom.mockReturnValueOnce(chainedQuery(null, { error: new Error("db down") }));

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(500);
  });
});