import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockList = vi.fn();
const mockUnread = vi.fn();
const mockMarkOne = vi.fn();
const mockMarkAll = vi.fn();
vi.mock("@/lib/notifications", () => ({
  listNotifications: (...a: unknown[]) => mockList(...a),
  unreadNotificationCount: (...a: unknown[]) => mockUnread(...a),
  markNotificationRead: (...a: unknown[]) => mockMarkOne(...a),
  markAllNotificationsRead: (...a: unknown[]) => mockMarkAll(...a),
}));

// The REAL AdminAuthError is preserved so `instanceof` narrowing works.
const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin-auth")>();
  return { ...actual, requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args) };
});

import { GET, PATCH } from "@/app/api/admin/notifications/route";
import { AdminAuthError } from "@/lib/admin-auth";

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BASE = "http://localhost/api/admin/notifications";

function getReq(url = BASE): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

function patchReq(body?: unknown): NextRequest {
  return new NextRequest(BASE, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({ profile: { id: ADMIN_ID } });
  mockList.mockResolvedValue([]);
  mockUnread.mockResolvedValue(0);
  mockMarkOne.mockResolvedValue(undefined);
  mockMarkAll.mockResolvedValue(undefined);
});

describe("GET /api/admin/notifications", () => {
  it("returns the feed page and the unread badge count", async () => {
    mockList.mockResolvedValue([{ id: "1" }]);
    mockUnread.mockResolvedValue(3);

    const res = await GET(getReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ data: [{ id: "1" }], unread: 3 });
  });

  it("defaults the limit to 50 and caps it at 200", async () => {
    await GET(getReq());
    expect(mockList).toHaveBeenCalledWith(50);

    await GET(getReq(`${BASE}?limit=9999`));
    expect(mockList).toHaveBeenLastCalledWith(200);

    await GET(getReq(`${BASE}?limit=-5`));
    expect(mockList).toHaveBeenLastCalledWith(50);
  });

  it("propagates the auth status", async () => {
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Unauthorized", 401));

    const res = await GET(getReq());

    expect(res.status).toBe(401);
  });

  it("returns 500 when the feed cannot be read", async () => {
    mockList.mockRejectedValue(new Error("db down"));

    const res = await GET(getReq());

    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/admin/notifications", () => {
  it("marks one notification read for the caller", async () => {
    const res = await PATCH(patchReq({ id: "abc" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, id: "abc" });
    expect(mockMarkOne).toHaveBeenCalledWith("abc", ADMIN_ID);
  });

  it("marks every notification read when all: true", async () => {
    const res = await PATCH(patchReq({ all: true }));
    const body = await res.json();

    expect(body).toEqual({ success: true, all: true });
    expect(mockMarkAll).toHaveBeenCalledWith(ADMIN_ID);
    expect(mockMarkOne).not.toHaveBeenCalled();
  });

  it("rejects a body with neither an id nor all: true", async () => {
    const res = await PATCH(patchReq({}));

    expect(res.status).toBe(400);
    expect(mockMarkOne).not.toHaveBeenCalled();
  });

  it("treats a missing body as a bad request", async () => {
    const res = await PATCH(patchReq());

    expect(res.status).toBe(400);
  });

  it("propagates the auth status", async () => {
    mockRequireAdmin.mockRejectedValue(new AdminAuthError("Forbidden", 403));

    const res = await PATCH(patchReq({ id: "abc" }));

    expect(res.status).toBe(403);
  });
});
