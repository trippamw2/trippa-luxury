import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────
type Settle = { data: unknown; error: unknown };

const INQUIRY_ID = "11111111-1111-4111-8111-111111111111";
const PROPERTY_UUID = "22222222-2222-4222-8222-222222222222";
const PASSTHROUGH_UUID = "33333333-3333-4333-8333-333333333333";

/**
 * Minimal Supabase query double. Reads (`select().eq().single()`) and inserts
 * (`insert().select().single()`) resolve through the configured result, while
 * `update().eq()` resolves as a thenable so the route can await it.
 */
function tableDouble(config: {
  result?: () => Settle;
  insertResult?: () => Settle;
  onInsert?: (values: Record<string, unknown>) => void;
  onEq?: (column: string, value: unknown) => void;
}) {
  let mode: "select" | "insert" | "update" = "select";

  const api = {
    select() {
      return api;
    },
    eq(column: string, value: unknown) {
      config.onEq?.(column, value);
      return mode === "update"
        ? Promise.resolve({ data: null, error: null })
        : api;
    },
    maybeSingle() {
      return Promise.resolve(config.result?.() ?? { data: null, error: null });
    },
    single() {
      const result =
        mode === "insert" ? config.insertResult?.() : config.result?.();
      return Promise.resolve(result ?? { data: null, error: null });
    },
    insert(values: Record<string, unknown>) {
      mode = "insert";
      config.onInsert?.(values);
      return api;
    },
    update() {
      mode = "update";
      return api;
    },
  };

  return api;
}

let inquiryInsertResult: Settle;
let guestSelectResult: Settle;
let guestInsertResult: Settle;
let propertyResult: Settle;
let insertedInquiries: Record<string, unknown>[];
let queriedPropertySlugs: string[];
let propertyTableQueried: boolean;

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  newInquiryEmail: (data: { fullName: string }) => ({
    subject: `New inquiry from ${data.fullName}`,
    htmlContent: `<p>${data.fullName}</p>`,
  }),
  inquiryConfirmationEmail: () => ({
    subject: "Your inquiry",
    htmlContent: "<p>Thank you</p>",
  }),
}));

const mockLlmProfile = vi.fn();
const mockPersistDna = vi.fn();
vi.mock("@/lib/ai/guest-profiler", () => ({
  guestProfiler: {
    llmProfile: (...args: unknown[]) => mockLlmProfile(...args),
  },
  persistClientDna: (...args: unknown[]) => mockPersistDna(...args),
}));

const mockLogInteraction = vi.fn();
vi.mock("@/lib/ai/customer-intelligence", () => ({
  logInteraction: (...args: unknown[]) => mockLogInteraction(...args),
}));

const mockCreateWorkflow = vi.fn();
vi.mock("@/lib/workflow-persistence", () => ({
  workflowPersistence: {
    createFromInquiry: (...args: unknown[]) => mockCreateWorkflow(...args),
  },
}));

const mockRegisterLead = vi.fn();
vi.mock("@/lib/pipeline/register", () => ({
  registerLeadFromInquiry: (...args: unknown[]) => mockRegisterLead(...args),
}));

const mockRecordEvent = vi.fn();
vi.mock("@/lib/ai/event-bus", () => ({
  recordEvent: (...args: unknown[]) => mockRecordEvent(...args),
}));

const mockPublicTake = vi.fn();
const mockLlmTake = vi.fn();
vi.mock("@/lib/public-rate-limiter", () => ({
  publicWriteLimiter: {
    take: (...args: unknown[]) => mockPublicTake(...args),
  },
  llmCostLimiter: {
    take: (...args: unknown[]) => mockLlmTake(...args),
  },
  resolveClientIp: () => "127.0.0.1",
  tooManyRequests: () => new Response(JSON.stringify({ error: "Too many" }), { status: 429 }),
}));

const mockGate = vi.fn();
vi.mock("@/lib/ai/action-gate", () => ({
  gateAiAction: (...args: unknown[]) => mockGate(...args),
  ActionBlockedError: class ActionBlockedError extends Error {},
  actionBlockedResponse: () => new Response(JSON.stringify({ error: "blocked" }), { status: 403 }),
}));

const mockCreateNotification = vi.fn();
vi.mock("@/lib/notifications", () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

import { POST } from "@/app/api/inquiry/route";

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Martin Kaponda",
      email: "martin@example.com",
      message: "We are planning a trip.",
      ...body,
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  inquiryInsertResult = { data: { id: INQUIRY_ID }, error: null };
  guestSelectResult = { data: null, error: null };
  guestInsertResult = { data: { id: "guest-profile-1" }, error: null };
  propertyResult = { data: null, error: null };
  insertedInquiries = [];
  queriedPropertySlugs = [];
  propertyTableQueried = false;

  mockFrom.mockImplementation((table: string) => {
    if (table === "properties") {
      propertyTableQueried = true;
      return tableDouble({
        result: () => propertyResult,
        onEq: (column, value) => {
          if (column === "slug") queriedPropertySlugs.push(String(value));
        },
      });
    }
if (table === "inquiries") {
      return tableDouble({
        result: () => inquiryInsertResult,
        insertResult: () => inquiryInsertResult,
        onInsert: (values) => insertedInquiries.push(values),
      });
    }
    if (table === "guest_profiles") {
      return tableDouble({
        result: () => guestSelectResult,
        insertResult: () => guestInsertResult,
      });
    }
    return tableDouble({});
  });

  mockPublicTake.mockResolvedValue({ allowed: true });
  mockLlmTake.mockResolvedValue({ allowed: true });
  mockGate.mockResolvedValue(undefined);
  mockLlmProfile.mockResolvedValue({
    id: "profile-1",
    isCouple: true,
    leadScore: 80,
    leadTier: "hot",
    preferences: {},
    extractedDestinations: [],
  });
  mockCreateWorkflow.mockResolvedValue({ id: "workflow-1" });
  mockPersistDna.mockResolvedValue({ ok: true });
  mockLogInteraction.mockResolvedValue(undefined);
  mockRegisterLead.mockResolvedValue({ error: null });
  mockRecordEvent.mockResolvedValue(undefined);
  mockCreateNotification.mockResolvedValue(undefined);
  mockSendEmail.mockResolvedValue(undefined);
});

describe("POST /api/inquiry — a failed insert is not a success", () => {
  it("returns 500 and runs no downstream AI/email work when the insert fails", async () => {
    inquiryInsertResult = {
      data: null,
      error: { message: "insert failed", code: "23503" },
    };

    const res = await POST(makeRequest({}));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("We could not save your inquiry. Please try again.");

    // Nothing downstream may run for an inquiry that does not exist.
    expect(mockLlmProfile).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockRecordEvent).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
    expect(mockRegisterLead).not.toHaveBeenCalled();
  });

  it("still records and responds normally when the insert succeeds", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.inquiryId).toBe(INQUIRY_ID);
    expect(mockRecordEvent).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    // Concierge notification + guest confirmation.
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });
});

describe("POST /api/inquiry — property slug attribution", () => {
  it("resolves a property slug to its UUID before insert", async () => {
    propertyResult = { data: { id: PROPERTY_UUID }, error: null };

    const res = await POST(makeRequest({ propertyId: "lake-malawi-lodge" }));

    expect(res.status).toBe(200);
    expect(propertyTableQueried).toBe(true);
    expect(queriedPropertySlugs).toContain("lake-malawi-lodge");
    expect(insertedInquiries[0].property_id).toBe(PROPERTY_UUID);
  });

  it("stores null for an unknown slug instead of failing the inquiry", async () => {
    propertyResult = { data: null, error: null };

    const res = await POST(makeRequest({ propertyId: "does-not-exist" }));

    expect(res.status).toBe(200);
    expect(insertedInquiries[0].property_id).toBeNull();
  });

  it("passes a real UUID through without a lookup", async () => {
    const res = await POST(makeRequest({ propertyId: PASSTHROUGH_UUID }));

    expect(res.status).toBe(200);
    expect(propertyTableQueried).toBe(false);
    expect(insertedInquiries[0].property_id).toBe(PASSTHROUGH_UUID);
  });
});
