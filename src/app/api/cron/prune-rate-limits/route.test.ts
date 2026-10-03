import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────
// The RPC returns one row per call: { deleted: number }.
const mockRpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mockRpc }),
}));

// Must import the route AFTER mocks are registered (hoisted).
import { POST } from "@/app/api/cron/prune-rate-limits/route";

function makeRequest(token: string | null): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new NextRequest("http://localhost/api/cron/prune-rate-limits", {
    method: "POST",
    headers,
  });
}

/** Answers each successive prune call with the given deleted counts. */
function pruneReturns(...counts: number[]): void {
  for (const count of counts) {
    mockRpc.mockResolvedValueOnce({ data: [{ deleted: count }], error: null });
  }
  // Anything past the scripted calls deletes nothing, ending the loop.
  mockRpc.mockResolvedValue({ data: [{ deleted: 0 }], error: null });
}

/** Every prune call finds a full batch, so the drain never ends on its own. */
function pruneAlwaysReturns(count: number): void {
  mockRpc.mockResolvedValue({ data: [{ deleted: count }], error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("POST /api/cron/prune-rate-limits", () => {
  it("returns 401 when the bearer token is missing", async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(401);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token is wrong", async () => {
    const res = await POST(makeRequest("wrong-token"));
    expect(res.status).toBe(401);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(503);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("calls the pruning RPC with a bounded batch size", async () => {
    pruneReturns(0);

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    expect(mockRpc).toHaveBeenCalledWith("prune_rate_limit_buckets", { p_max_rows: 5000 });
  });

  it("drains in batches until a pass deletes nothing", async () => {
    pruneReturns(5000, 1200, 0);

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.deleted).toBe(6200);
    // Three passes: two that deleted rows, then the one that ended the drain.
    expect(body.passes).toBe(3);
    expect(body.more).toBe(false);
    expect(body.message).toContain("6200");
  });

  it("reports that work remains instead of looping forever on a huge backlog", async () => {
    // Every pass still has rows, so the drain must stop at the batch ceiling.
    pruneAlwaysReturns(5000);

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(mockRpc).toHaveBeenCalledTimes(20);
    expect(body.deleted).toBe(100_000);
    expect(body.more).toBe(true);
    expect(body.message).toContain("more remain");
  });

  it("returns 500 when the RPC fails", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "db down" },
    });

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("db down");
  });

  it("treats an unexpected RPC payload as nothing to delete rather than crashing", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest("test-secret"));
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(0);
  });
});