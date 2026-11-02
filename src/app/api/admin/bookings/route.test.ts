import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockHandleCreate = vi.fn();
vi.mock("@/lib/api-helpers", () => ({
  handleGetList: vi.fn(),
  handleCreate: (...args: unknown[]) => mockHandleCreate(...args),
}));

const mockEnsureGuestAuthUser = vi.fn();
vi.mock("@/lib/guest-auth-provision", () => ({
  ensureGuestAuthUser: (...args: unknown[]) => mockEnsureGuestAuthUser(...args),
}));

import { POST } from "@/app/api/admin/bookings/route";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/bookings", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHandleCreate.mockResolvedValue(
    NextResponse.json({ id: "b-1", clientEmail: "guest@example.com" }, { status: 201 })
  );
  mockEnsureGuestAuthUser.mockResolvedValue({
    created: true,
    skipped: false,
    failed: false,
  });
});

describe("POST /api/admin/bookings — guest portal provisioning", () => {
  it("provisions the guest portal user for a booking with an address", async () => {
    const res = await POST(makeRequest({ client_email: "guest@example.com" }));

    expect(res.status).toBe(201);
    expect(mockEnsureGuestAuthUser).toHaveBeenCalledTimes(1);
    expect(mockEnsureGuestAuthUser).toHaveBeenCalledWith("guest@example.com");
  });

  it("provisions the address after the booking was created", async () => {
    const order: string[] = [];
    mockHandleCreate.mockImplementation(async () => {
      order.push("create");
      return NextResponse.json({ id: "b-1" }, { status: 201 });
    });
    mockEnsureGuestAuthUser.mockImplementation(async () => {
      order.push("provision");
      return { created: true, skipped: false, failed: false };
    });

    await POST(makeRequest({ client_email: "guest@example.com" }));

    expect(order).toEqual(["create", "provision"]);
  });

  it("does not provision a booking without an address", async () => {
    const res = await POST(makeRequest({ client_name: "Martin Kaponda" }));

    expect(res.status).toBe(201);
    expect(mockEnsureGuestAuthUser).not.toHaveBeenCalled();
  });

  it("does not provision when the booking was not created", async () => {
    mockHandleCreate.mockResolvedValue(
      NextResponse.json({ error: "boom" }, { status: 500 })
    );

    const res = await POST(makeRequest({ client_email: "guest@example.com" }));

    expect(res.status).toBe(500);
    expect(mockEnsureGuestAuthUser).not.toHaveBeenCalled();
  });

  it("still creates the booking when provisioning reports a failure", async () => {
    mockEnsureGuestAuthUser.mockResolvedValue({
      created: false,
      skipped: false,
      failed: true,
      reason: "auth_unavailable",
    });

    const res = await POST(makeRequest({ client_email: "guest@example.com" }));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("b-1");
  });

  it("still creates the booking when provisioning throws", async () => {
    mockEnsureGuestAuthUser.mockRejectedValue(new Error("network down"));

    const res = await POST(makeRequest({ client_email: "guest@example.com" }));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("b-1");
  });
});
