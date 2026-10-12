import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  newsletterWelcomeEmail: () => ({ subject: "Welcome", htmlContent: "<p>Hi</p>" }),
}));

const mockTake = vi.fn();
vi.mock("@/lib/public-rate-limiter", () => ({
  clientKey: () => "test-key",
  publicWriteLimiter: { take: (...args: unknown[]) => mockTake(...args) },
}));

const mockEnsure = vi.fn();
const mockLift = vi.fn();
vi.mock("@/lib/email-consent", () => ({
  ensureMarketingSuppression: (...args: unknown[]) => mockEnsure(...args),
  liftMarketingSuppression: (...args: unknown[]) => mockLift(...args),
}));

import { POST, DELETE } from "@/app/api/newsletter/route";

type Settle = { data: unknown; error: unknown };

/** Result returned by `.select(...).eq(...).single()`. */
let readResult: Settle;
/** Result awaited by `insert` / `update` chains. */
let writeResult: Settle;
/** Rows written via `insert`/`update`, in order. */
let writes: unknown[];
/** `(table, column, value)` for every `.eq()` on a write chain. */
let eqCalls: { column: string; value: unknown }[];

function installMock(): void {
  mockFrom.mockImplementation((_table: string) => {
    const chain: Record<string, unknown> = {};
    const ret = () => chain;
    chain.select = ret;
    chain.eq = (column: string, value: unknown) => {
      eqCalls.push({ column, value });
      return chain;
    };
    chain.single = () => Promise.resolve(readResult);
    chain.insert = (row: unknown) => {
      writes.push(row);
      return Promise.resolve(writeResult);
    };
    chain.update = (row: unknown) => {
      writes.push(row);
      return chain;
    };
    chain.then = (resolve: (value: unknown) => void) => resolve(writeResult);
    return chain;
  });
}

function jsonRequest(method: string, body: unknown): Request {
  return new Request("http://localhost/api/newsletter", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  readResult = { data: null, error: null };
  writeResult = { data: null, error: null };
  writes = [];
  eqCalls = [];
  mockTake.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  mockSendEmail.mockResolvedValue({ success: true, messageId: "<w@x>" });
  mockEnsure.mockResolvedValue({ ok: true });
  installMock();
});

describe("POST /api/newsletter", () => {
  it("rejects an invalid address", async () => {
    const res = await POST(jsonRequest("POST", { email: "not-an-email" }));

    expect(res.status).toBe(400);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 429 when the public write limiter refuses", async () => {
    mockTake.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });

    const res = await POST(jsonRequest("POST", { email: "a@b.com" }));

    expect(res.status).toBe(429);
  });

  it("subscribes a new address, lifts any suppression, and welcomes it", async () => {
    const res = await POST(jsonRequest("POST", { email: "New@Guest.com" }));

    expect(res.status).toBe(200);
    expect(writes).toContainEqual({ email: "New@Guest.com", is_active: true });
    expect(mockLift).toHaveBeenCalledWith("New@Guest.com");
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("reactivates a lapsed subscriber instead of inserting a duplicate", async () => {
    readResult = { data: { email: "old@guest.com", is_active: false }, error: null };

    const res = await POST(jsonRequest("POST", { email: "old@guest.com" }));

    expect(res.status).toBe(200);
    expect(writes).toContainEqual({ is_active: true, unsubscribed_at: null });
    // No insert happened, only the reactivation update.
    expect(writes.filter((w) => (w as { email?: string }).email)).toEqual([]);
    expect(mockLift).toHaveBeenCalledWith("old@guest.com");
  });
});

describe("DELETE /api/newsletter", () => {
  it("rejects an invalid address", async () => {
    const res = await DELETE(jsonRequest("DELETE", { email: "nope" }));

    expect(res.status).toBe(400);
    expect(mockEnsure).not.toHaveBeenCalled();
  });

  it("deactivates the subscriber and records a global marketing suppression", async () => {
    const res = await DELETE(jsonRequest("DELETE", { email: "bye@guest.com" }));

    expect(res.status).toBe(200);
    expect(writes[0]).toMatchObject({ is_active: false });
    expect(mockEnsure).toHaveBeenCalledWith({
      email: "bye@guest.com",
      source: "public_unsubscribe",
    });
  });
});
