import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — the route is a thin guard over handleUpdate plus a joined read, so
// we assert on the payload handed to handleUpdate and on the row returned from
// Supabase rather than on either implementation.
// ---------------------------------------------------------------------------

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin-auth", () => {
  class AdminAuthError extends Error {
    constructor(
      message: string,
      public status: number = 401
    ) {
      super(message);
      this.name = "AdminAuthError";
    }
  }
  return { requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args), AdminAuthError };
});

const mockHandleUpdate = vi.fn();
const mockHandleDelete = vi.fn();

// joinSingle / mapKeysToCamel stay real: the GET handler derives the view-model
// names from them, so stubbing them would let the test pass against wrong data.
vi.mock("@/lib/api-helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-helpers")>();
  return {
    ...actual,
    handleUpdate: (...args: unknown[]) => mockHandleUpdate(...args),
    handleDelete: (...args: unknown[]) => mockHandleDelete(...args),
  };
});

const mockRegisterBooking = vi.fn();
const mockRegisterReview = vi.fn();
vi.mock("@/lib/pipeline/register", () => ({
  registerBookingFromProposal: (...args: unknown[]) => mockRegisterBooking(...args),
  registerProposalReviewStage: (...args: unknown[]) => mockRegisterReview(...args),
}));

let mockGetResult: { data: Record<string, unknown> | null; error: { code: string } | null } = {
  data: null,
  error: null,
};

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { GET, PUT } from "@/app/api/admin/proposals/[id]/route";

const PROPOSAL_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/admin/proposals/${PROPOSAL_ID}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function getParams() {
  return { params: Promise.resolve({ id: PROPOSAL_ID }) };
}

/** Payload actually handed to handleUpdate for the first call. */
function updatePayload(): Record<string, unknown> {
  expect(mockHandleUpdate).toHaveBeenCalled();
  return mockHandleUpdate.mock.calls[0][2] as Record<string, unknown>;
}

function timestampKeys(payload: Record<string, unknown>): string[] {
  return Object.keys(payload).filter((k) => k.endsWith("_at") || k.endsWith("_date"));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({ profile: { id: "admin-1", role: "agent" } });
  mockHandleUpdate.mockResolvedValue(
    NextResponse.json({ id: PROPOSAL_ID, status: "sent" })
  );
  mockHandleDelete.mockResolvedValue(NextResponse.json({ ok: true }));
  mockRegisterBooking.mockResolvedValue({
    registered: false,
    bookingId: null,
    bookingReference: null,
    error: null,
  });
  mockRegisterReview.mockResolvedValue({
    registered: false,
    reviewRequested: false,
    adminApproved: false,
    error: null,
  });
  mockGetResult = { data: null, error: null };
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve(mockGetResult)),
  });
});

describe("PUT /api/admin/proposals/[id] — status timestamps", () => {
  it("stamps sent_date, never the non-existent sent_at", async () => {
    await PUT(makeRequest({ status: "sent" }), getParams());

    const payload = updatePayload();
    expect(payload).toHaveProperty("sent_date");
    expect(payload).not.toHaveProperty("sent_at");
    expect(payload.sent_date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(payload.status).toBe("sent");
  });

  it("stamps accepted_date, never the non-existent accepted_at", async () => {
    await PUT(makeRequest({ status: "accepted" }), getParams());

    const payload = updatePayload();
    expect(payload).toHaveProperty("accepted_date");
    expect(payload).not.toHaveProperty("accepted_at");
  });

  it("writes no timestamp at all when declined — the column does not exist", async () => {
    await PUT(makeRequest({ status: "declined" }), getParams());

    const payload = updatePayload();
    expect(payload.status).toBe("declined");
    expect(timestampKeys(payload)).toEqual([]);
  });

  it("writes no timestamp for an unrelated status change", async () => {
    await PUT(makeRequest({ status: "draft" }), getParams());

    const payload = updatePayload();
    expect(timestampKeys(payload)).toEqual([]);
  });

  it("does not override a caller-supplied camelCase sentDate", async () => {
    await PUT(
      makeRequest({ status: "sent", sentDate: "2026-01-01T00:00:00.000Z" }),
      getParams()
    );

    const payload = updatePayload();
    expect(payload).not.toHaveProperty("sent_date");
    expect(payload.sentDate).toBe("2026-01-01T00:00:00.000Z");
  });

  it("does not override a caller-supplied snake_case sent_date", async () => {
    await PUT(
      makeRequest({ status: "sent", sent_date: "2026-01-01T00:00:00.000Z" }),
      getParams()
    );

    const payload = updatePayload();
    expect(payload.sent_date).toBe("2026-01-01T00:00:00.000Z");
  });

  it("never forwards phantom legacy timestamp keys", async () => {
    await PUT(
      makeRequest({ status: "declined", sent_at: "x", accepted_at: "y", declined_at: "z" }),
      getParams()
    );

    const payload = updatePayload();
    expect(payload).not.toHaveProperty("sent_at");
    expect(payload).not.toHaveProperty("accepted_at");
    expect(payload).not.toHaveProperty("declined_at");
  });

  it("registers the pipeline review stage for a ready transition", async () => {
    await PUT(makeRequest({ status: "ready" }), getParams());

    expect(mockRegisterReview).toHaveBeenCalledWith(PROPOSAL_ID, "ready", {
      actorId: "admin-1",
    });
  });
});

describe("GET /api/admin/proposals/[id] — joined detail read", () => {
  it("returns 404 when the proposal does not exist", async () => {
    mockGetResult = { data: null, error: { code: "PGRST116" } };

    const res = await GET(
      new NextRequest(`http://localhost/api/admin/proposals/${PROPOSAL_ID}`),
      getParams()
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Not found");
  });

  it("derives customer and journey names from the joins", async () => {
    mockGetResult = {
      data: {
        id: PROPOSAL_ID,
        proposal_reference: "KIV-483920",
        title: "South Luangwa & Zanzibar",
        status: "draft",
        currency: "USD",
        total_investment: 24500,
        leads: [
          { full_name: "Eleanor Vance", email: "eleanor@example.com", phone: "+260 977 000 111" },
        ],
        journeys: [{ journey_name: "South Luangwa Escape", slug: "south-luangwa" }],
      },
      error: null,
    };

    const res = await GET(
      new NextRequest(`http://localhost/api/admin/proposals/${PROPOSAL_ID}`),
      getParams()
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.customerName).toBe("Eleanor Vance");
    expect(json.customerEmail).toBe("eleanor@example.com");
    expect(json.customerPhone).toBe("+260 977 000 111");
    expect(json.journeyName).toBe("South Luangwa Escape");
    // Own columns arrive camelCased by mapKeysToCamel.
    expect(json.proposalReference).toBe("KIV-483920");
    expect(json.totalInvestment).toBe(24500);
  });

  it("leaves names null when the related rows are absent", async () => {
    mockGetResult = {
      data: { id: PROPOSAL_ID, title: "Unlinked proposal", leads: null, journeys: null },
      error: null,
    };

    const res = await GET(
      new NextRequest(`http://localhost/api/admin/proposals/${PROPOSAL_ID}`),
      getParams()
    );

    const json = await res.json();
    expect(json.customerName).toBeNull();
    expect(json.journeyName).toBeNull();
  });

  it("is guarded by requireAdmin", async () => {
    mockGetResult = { data: { id: PROPOSAL_ID, title: "x" }, error: null };

    await GET(new NextRequest(`http://localhost/api/admin/proposals/${PROPOSAL_ID}`), getParams());

    expect(mockRequireAdmin).toHaveBeenCalledWith({
      module: "proposals",
      minRole: "agent",
    });
  });
});
