import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// The single-service route is a thin delegation layer over the shared helpers.
// These tests pin the wiring (table name, id extraction, body pass-through, the
// request object handed to the audit-aware helpers) so a refactor cannot quietly
// drop the audit-log write or misroute the table.
const mockHandleGetOne = vi.fn();
const mockHandleUpdate = vi.fn();
const mockHandleDelete = vi.fn();

vi.mock("@/lib/api-helpers", () => ({
  handleGetOne: (...args: unknown[]) => mockHandleGetOne(...args),
  handleUpdate: (...args: unknown[]) => mockHandleUpdate(...args),
  handleDelete: (...args: unknown[]) => mockHandleDelete(...args),
}));

import { GET, PUT, DELETE } from "@/app/api/admin/services/[id]/route";

const ID = "3f9a1c2e-5b7d-4a1f-9c3e-2d8b6a4f0e11";

function params() {
  return { params: Promise.resolve({ id: ID }) };
}

function request(method: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/admin/services/${ID}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "content-type": "application/json" } : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHandleGetOne.mockResolvedValue(NextResponse.json({ id: ID }));
  mockHandleUpdate.mockResolvedValue(NextResponse.json({ id: ID }));
  mockHandleDelete.mockResolvedValue(NextResponse.json({ success: true }));
});

describe("GET /api/admin/services/[id]", () => {
  it("reads the service through the shared helper", async () => {
    const res = await GET(request("GET"), params());

    expect(res.status).toBe(200);
    expect(mockHandleGetOne).toHaveBeenCalledWith("services", ID);
  });

  it("surfaces the helper's auth failure without a second check", async () => {
    mockHandleGetOne.mockResolvedValue(
      NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    );

    const res = await GET(request("GET"), params());

    expect(res.status).toBe(401);
  });
});

describe("PUT /api/admin/services/[id]", () => {
  it("parses the body and updates via the helper, preserving the request", async () => {
    const body = { name: "Sunset Cruise", isActive: true };
    const req = request("PUT", body);

    const res = await PUT(req, params());

    expect(res.status).toBe(200);
    expect(mockHandleUpdate).toHaveBeenCalledTimes(1);
    const [table, id, passedBody, passedReq] = mockHandleUpdate.mock.calls[0];
    expect(table).toBe("services");
    expect(id).toBe(ID);
    expect(passedBody).toEqual(body);
    // The request must reach the helper: it carries the IP the audit entry logs.
    expect(passedReq).toBe(req);
  });
});

describe("DELETE /api/admin/services/[id]", () => {
  it("deletes via the helper, preserving the request", async () => {
    const req = request("DELETE");

    const res = await DELETE(req, params());

    expect(res.status).toBe(200);
    expect(mockHandleDelete).toHaveBeenCalledWith("services", ID, req);
  });
});
