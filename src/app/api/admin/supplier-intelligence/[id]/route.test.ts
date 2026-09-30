import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAdmin = vi.fn();
const mockScoreSupplier = vi.fn();
const mockRecordSupplierPerformance = vi.fn();

// Define the error class inside the factory rather than pulling the real module
// through with importOriginal: the real one drags in the Supabase server client,
// and the route only ever uses it for `instanceof`. Same class, no side effects.
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

vi.mock("@/lib/ai/supplier-intelligence", () => ({
  supplierIntelligence: {
    scoreSupplier: (id: string) => mockScoreSupplier(id),
    appraise: vi.fn(),
  },
  recordSupplierPerformance: (supplier: unknown) => mockRecordSupplierPerformance(supplier),
}));

// Must import the route AFTER mocks are registered (hoisted).
import { GET, POST } from "@/app/api/admin/supplier-intelligence/[id]/route";

const SUPPLIER_ID = "3f9a1c2e-5b7d-4a1f-9c3e-2d8b6a4f0e11";
const OTHER_ID = "9c1e4b7a-2d3f-4a5b-8c6d-7e8f9a0b1c2d";

function scoredSupplier(id: string = SUPPLIER_ID) {
  return {
    id,
    name: "Romance Villa Zanzibar",
    score: {
      overall: 82,
      tier: "preferred",
      dimensions: { responsiveness: 80, reliability: 85, quality: 82 },
      strengths: ["Contract on file", "Insurance on file"],
      concerns: [],
    },
  };
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function request(): NextRequest {
  return new NextRequest(`http://localhost/api/admin/supplier-intelligence/${SUPPLIER_ID}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({ profile: { id: OTHER_ID } });
  mockScoreSupplier.mockResolvedValue(scoredSupplier());
  mockRecordSupplierPerformance.mockResolvedValue({
    ok: true,
    action: "recorded",
    row: {},
    error: null,
  });
});

describe("POST /api/admin/supplier-intelligence/[id] — auth", () => {
  it("returns the auth status and never touches the ledger when unauthenticated", async () => {
    const { AdminAuthError } = await import("@/lib/admin-auth");
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Not authenticated", 401));

    const res = await POST(request(), params(SUPPLIER_ID));

    expect(res.status).toBe(401);
    expect(mockScoreSupplier).not.toHaveBeenCalled();
    expect(mockRecordSupplierPerformance).not.toHaveBeenCalled();
  });

  it("does not write when the caller lacks the suppliers module", async () => {
    const { AdminAuthError } = await import("@/lib/admin-auth");
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Forbidden", 403));

    const res = await POST(request(), params(SUPPLIER_ID));

    expect(res.status).toBe(403);
    expect(mockRecordSupplierPerformance).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/supplier-intelligence/[id] — recording", () => {
  it("appends the appraisal and reports it as recorded", async () => {
    const res = await POST(request(), params(SUPPLIER_ID));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recorded).toBe(true);
    expect(body.action).toBe("recorded");
    expect(mockRecordSupplierPerformance).toHaveBeenCalledTimes(1);
    expect(mockRecordSupplierPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ id: SUPPLIER_ID })
    );
  });

  it("404s for an unknown supplier without writing", async () => {
    mockScoreSupplier.mockResolvedValue(null);

    const res = await POST(request(), params(SUPPLIER_ID));

    expect(res.status).toBe(404);
    expect(mockRecordSupplierPerformance).not.toHaveBeenCalled();
  });

  it("reports a skipped write for a non-UUID id instead of claiming success", async () => {
    mockScoreSupplier.mockResolvedValue(scoredSupplier("not-a-uuid"));
    mockRecordSupplierPerformance.mockResolvedValue({
      ok: true,
      action: "skipped",
      row: null,
      error: null,
    });

    const res = await POST(request(), params("not-a-uuid"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toBe("skipped");
    expect(body.recorded).toBe(false);
  });

  it("fails loudly when the ledger write errors, rather than answering 200", async () => {
    // recordSupplierPerformance never throws — a lost institutional-memory write
    // must not fail the request that triggered it. That makes the error
    // invisible to the caller unless it is surfaced here, so a 500 is the only
    // thing standing between a failed append and a believed success.
    mockRecordSupplierPerformance.mockResolvedValue({
      ok: false,
      action: "skipped",
      row: null,
      error: "append-only violation",
    });

    const res = await POST(request(), params(SUPPLIER_ID));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.recorded).toBe(false);
    expect(body.error).toBe("append-only violation");
  });

  it("surfaces a thrown write as a 500 instead of crashing the route", async () => {
    mockRecordSupplierPerformance.mockRejectedValue(new Error("network down"));

    const res = await POST(request(), params(SUPPLIER_ID));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("network down");
  });
});

describe("GET /api/admin/supplier-intelligence/[id] — no write side effects", () => {
  it("returns the score without appending to the immutable ledger", async () => {
    // Guards the reason this endpoint is POST-only. supplier_performance is
    // append-only, so recording on read would let a refresh or a prefetch write
    // a row that can never be retracted.
    const res = await GET(request(), params(SUPPLIER_ID));

    expect(res.status).toBe(200);
    expect((await res.json()).supplier.id).toBe(SUPPLIER_ID);
    expect(mockRecordSupplierPerformance).not.toHaveBeenCalled();
  });
});
