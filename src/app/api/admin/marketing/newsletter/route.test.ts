import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const mockSendEmail = vi.fn();
const mockRecordEmailDeliveries = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  recordEmailDeliveries: (...args: unknown[]) => mockRecordEmailDeliveries(...args),
  newsletterCampaignEmail: ({ subject }: { subject: string }) => ({
    subject,
    htmlContent: "<p>rendered campaign</p>",
  }),
}));

// The REAL AdminAuthError class is preserved so `instanceof` narrowing works.
const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin-auth")>();
  return { ...actual, requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args) };
});

const mockAuditLog = vi.fn();
vi.mock("@/lib/audit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/audit")>();
  return {
    ...actual,
    createAuditLog: (entry: unknown) => mockAuditLog(entry),
    getIpFromRequest: () => "127.0.0.1",
  };
});

const mockPartition = vi.fn();
vi.mock("@/lib/email-consent", () => ({
  partitionSuppressed: (...args: unknown[]) => mockPartition(...args),
  normalizeEmail: (e: string | null | undefined) => (e ?? "").trim().toLowerCase(),
}));

import { POST } from "@/app/api/admin/marketing/newsletter/route";
import { AdminAuthError } from "@/lib/admin-auth";

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type Settle = { data: unknown; error: unknown };

/** Result awaited by the audience-resolution query. */
let listResult: Settle;
/** Tables `from` was asked for, in order. */
let queryTables: string[];

function installMock(): void {
  mockFrom.mockImplementation((table: string) => {
    queryTables.push(table);
    const chain: Record<string, unknown> = {};
    const ret = () => chain;
    for (const method of ["select", "eq", "not", "contains", "limit", "order"]) {
      chain[method] = ret;
    }
    chain.then = (resolve: (value: unknown) => void) => resolve(listResult);
    return chain;
  });
}

function campaignRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/marketing/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Default partition: everyone allowed. */
function allowAll(): void {
  mockPartition.mockImplementation(async (emails: string[]) => ({
    allowed: emails,
    blocked: [],
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  listResult = { data: [{ email: "sub@example.com" }], error: null };
  queryTables = [];
  mockRequireAdmin.mockResolvedValue({ profile: { id: ADMIN_ID } });
  mockAuditLog.mockResolvedValue(undefined);
  mockSendEmail.mockResolvedValue({ success: true, messageId: "<c@x>" });
  mockRecordEmailDeliveries.mockResolvedValue(undefined);
  allowAll();
  installMock();
});

describe("POST /api/admin/marketing/newsletter", () => {
  it("refuses a caller who is not authorized for marketing", async () => {
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Forbidden", 403));

    const res = await POST(campaignRequest({ subject: "S", bodyHtml: "<p>b</p>" }));

    expect(res.status).toBe(403);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("requires a subject and body", async () => {
    const res = await POST(campaignRequest({ subject: "", bodyHtml: "" }));

    expect(res.status).toBe(400);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("reports an empty audience rather than sending nothing silently", async () => {
    listResult = { data: [], error: null };

    const res = await POST(campaignRequest({ subject: "S", bodyHtml: "<p>b</p>" }));

    expect(res.status).toBe(400);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // A preview must resolve the audience and report suppression WITHOUT sending.
  it("previews the resolved audience without sending", async () => {
    listResult = { data: [{ email: "a@x.com" }, { email: "b@x.com" }], error: null };
    mockPartition.mockResolvedValue({ allowed: ["a@x.com"], blocked: ["b@x.com"] });

    const res = await POST(
      campaignRequest({ subject: "S", bodyHtml: "<p>b</p>", preview: true })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.preview).toBe(true);
    expect(body.matched).toBe(2);
    expect(body.suppressed).toBe(1);
    expect(body.recipients).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends to the newsletter list with a List-Unsubscribe header", async () => {
    listResult = { data: [{ email: "a@x.com" }, { email: "b@x.com" }], error: null };

    const res = await POST(campaignRequest({ subject: "Hi", bodyHtml: "<p>b</p>" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sent).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const arg = mockSendEmail.mock.calls[0][0] as {
      headers?: Record<string, string>;
      log?: boolean;
    };
    expect(arg.headers?.["List-Unsubscribe"]).toBeDefined();
    // The campaign logs per recipient itself, so sendEmail must not double-log.
    expect(arg.log).toBe(false);
  });

  // Observability gap this closes: one row per recipient, not just the first.
  it("records a delivery row for every recipient", async () => {
    listResult = { data: [{ email: "a@x.com" }, { email: "b@x.com" }], error: null };

    await POST(campaignRequest({ subject: "Hi", bodyHtml: "<p>b</p>" }));

    expect(mockRecordEmailDeliveries).toHaveBeenCalledTimes(1);
    const entries = mockRecordEmailDeliveries.mock.calls[0][0] as unknown[];
    expect(entries).toHaveLength(2);
  });

  it("resolves guests with consent when the audience source is guests", async () => {
    listResult = { data: [{ full_name: "VIP Guest", email: "vip@x.com" }], error: null };

    const res = await POST(
      campaignRequest({
        subject: "Hi",
        bodyHtml: "<p>b</p>",
        audience: { source: "guests", vipOnly: true, tags: ["safari"] },
      })
    );

    expect(res.status).toBe(200);
    expect(queryTables).toContain("guest_profiles");
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  // Fail closed: an unreadable do-not-email list must abort the whole campaign.
  it("sends nothing when the do-not-email list cannot be read", async () => {
    mockPartition.mockRejectedValue(new Error("db down"));

    const res = await POST(campaignRequest({ subject: "Hi", bodyHtml: "<p>b</p>" }));

    expect(res.status).toBe(503);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("refuses when every matching recipient is suppressed", async () => {
    listResult = { data: [{ email: "a@x.com" }], error: null };
    mockPartition.mockResolvedValue({ allowed: [], blocked: ["a@x.com"] });

    const res = await POST(campaignRequest({ subject: "Hi", bodyHtml: "<p>b</p>" }));

    expect(res.status).toBe(400);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
