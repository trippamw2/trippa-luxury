import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — the route is a thin guard over handleUpdate, so we assert on the
// delegation rather than on Supabase.
// ---------------------------------------------------------------------------

const mockHandleGetOne = vi.fn();
const mockHandleUpdate = vi.fn();
const mockHandleDelete = vi.fn();

vi.mock("@/lib/api-helpers", () => ({
  handleGetOne: (...args: unknown[]) => mockHandleGetOne(...args),
  handleUpdate: (...args: unknown[]) => mockHandleUpdate(...args),
  handleDelete: (...args: unknown[]) => mockHandleDelete(...args),
}));

import { PUT } from "@/app/api/admin/inquiries/[id]/route";

const INQUIRY_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/admin/inquiries/${INQUIRY_ID}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function params() {
  return { params: Promise.resolve({ id: INQUIRY_ID }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHandleUpdate.mockResolvedValue(
    NextResponse.json({ id: INQUIRY_ID, status: "closed" })
  );
});

describe("PUT /api/admin/inquiries/[id] — closed-lost requires a reason", () => {
  it("refuses to close an enquiry with no reason", async () => {
    const res = await PUT(makeRequest({ status: "closed" }), params());

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/reason is required/i);
    expect(mockHandleUpdate).not.toHaveBeenCalled();
  });

  it("refuses a blank reason", async () => {
    const res = await PUT(
      makeRequest({ status: "closed", lostReason: "   " }),
      params()
    );

    expect(res.status).toBe(409);
    expect(mockHandleUpdate).not.toHaveBeenCalled();
  });

  it("accepts a close that carries a reason", async () => {
    const res = await PUT(
      makeRequest({ status: "closed", lostReason: "Chose a competitor" }),
      params()
    );

    expect(res.status).toBe(200);
    expect(mockHandleUpdate).toHaveBeenCalledWith(
      "inquiries",
      INQUIRY_ID,
      { status: "closed", lostReason: "Chose a competitor" },
      expect.anything()
    );
  });

  it("accepts a snake_case reason too", async () => {
    const res = await PUT(
      makeRequest({ status: "closed", lost_reason: "Budget" }),
      params()
    );

    expect(res.status).toBe(200);
    expect(mockHandleUpdate).toHaveBeenCalled();
  });

  it("does not interfere with a non-closing status change", async () => {
    const res = await PUT(
      makeRequest({ status: "contacted" }),
      params()
    );

    expect(res.status).toBe(200);
    expect(mockHandleUpdate).toHaveBeenCalled();
  });
});
