import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockHandleGetList = vi.fn();
const mockHandleCreate = vi.fn();

vi.mock("@/lib/api-helpers", () => ({
  handleGetList: (...args: unknown[]) => mockHandleGetList(...args),
  handleCreate: (...args: unknown[]) => mockHandleCreate(...args),
}));

import { GET, POST } from "@/app/api/admin/services/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockHandleGetList.mockResolvedValue(NextResponse.json({ data: [], count: 0 }));
  mockHandleCreate.mockResolvedValue(NextResponse.json({ id: "new" }, { status: 201 }));
});

describe("GET /api/admin/services", () => {
  it("lists services through the shared helper", async () => {
    const request = new NextRequest("http://localhost/api/admin/services");

    const res = await GET(request);

    expect(res.status).toBe(200);
    expect(mockHandleGetList).toHaveBeenCalledWith("services", request);
  });
});

describe("POST /api/admin/services", () => {
  it("creates a service through the shared helper, preserving the request", async () => {
    const body = { name: "Sunset Cruise", category: "experience" };
    const request = new Request("http://localhost/api/admin/services", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(request);

    expect(res.status).toBe(201);
    expect(mockHandleCreate).toHaveBeenCalledTimes(1);
    const [table, passedBody, passedReq] = mockHandleCreate.mock.calls[0];
    expect(table).toBe("services");
    expect(passedBody).toEqual(body);
    expect(passedReq).toBe(request);
  });
});
