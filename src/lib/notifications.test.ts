import { describe, it, expect, vi, beforeEach } from "vitest";

// The notification helpers own the DB boundary, so the supabase client is mocked
// here rather than hitting a database. Every helper is also a pure function of
// the rows it reads, which is what makes them testable this way.
interface Settle {
  data: unknown;
  error: unknown;
  count: number;
}

let settle: Settle;
const calls: string[] = [];
const inserted: Record<string, unknown>[] = [];
const updates: Record<string, unknown>[] = [];

function chain(): unknown {
  const next = (): object =>
    new Proxy({} as object, {
      get(_target, prop) {
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve(settle);
        return (...args: unknown[]) => {
          const name = String(prop);
          calls.push(name);
          if (name === "insert") inserted.push(args[0] as Record<string, unknown>);
          if (name === "update") updates.push(args[0] as Record<string, unknown>);
          return next();
        };
      },
    });
  return next();
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => chain() }),
}));

import {
  parseNotificationRow,
  createNotification,
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";

const VALID_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "inquiry_created",
  title: "New inquiry from Martinez",
  body: "South Luangwa",
  link: "/admin/inquiries",
  entity_type: "inquiry",
  entity_id: "22222222-2222-4222-8222-222222222222",
  read_at: null,
  created_at: "2026-10-12T08:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  inserted.length = 0;
  updates.length = 0;
  settle = { data: null, error: null, count: 0 };
});

describe("parseNotificationRow", () => {
  it("maps a valid row onto the camel-cased shape", () => {
    const parsed = parseNotificationRow(VALID_ROW);
    expect(parsed).toEqual({
      id: VALID_ROW.id,
      type: "inquiry_created",
      title: "New inquiry from Martinez",
      body: "South Luangwa",
      link: "/admin/inquiries",
      entityType: "inquiry",
      entityId: "22222222-2222-4222-8222-222222222222",
      readAt: null,
      createdAt: "2026-10-12T08:00:00Z",
    });
  });

  it("returns null for a non-object", () => {
    expect(parseNotificationRow(null)).toBeNull();
    expect(parseNotificationRow("nope")).toBeNull();
  });

  it("returns null when a required field is missing or empty", () => {
    expect(parseNotificationRow({ ...VALID_ROW, id: "" })).toBeNull();
    expect(parseNotificationRow({ ...VALID_ROW, type: undefined })).toBeNull();
    expect(parseNotificationRow({ ...VALID_ROW, title: null })).toBeNull();
  });

  it("degrades optional fields rather than throwing", () => {
    const parsed = parseNotificationRow({
      id: "x",
      type: "t",
      title: "h",
      body: 42,
      read_at: undefined,
    });
    expect(parsed).toEqual({
      id: "x",
      type: "t",
      title: "h",
      body: null,
      link: null,
      entityType: null,
      entityId: null,
      readAt: null,
      createdAt: "",
    });
  });
});

describe("createNotification", () => {
  it("inserts the notification with snake_cased fields", async () => {
    await createNotification({
      type: "payment_received",
      title: "Payment received",
      body: "USD 4,200",
      link: "/admin/finance",
      entityType: "booking",
      entityId: "abc",
    });

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      type: "payment_received",
      title: "Payment received",
      body: "USD 4,200",
      link: "/admin/finance",
      entity_type: "booking",
      entity_id: "abc",
    });
  });

  it("defaults absent optional fields to null", async () => {
    await createNotification({ type: "x", title: "y" });
    expect(inserted[0]).toMatchObject({ body: null, link: null, entity_type: null, entity_id: null });
  });

  // Instrumentation that can fail the flow it instruments is instrumentation
  // nobody turns on: a failed notification must never surface to the caller.
  it("swallows a database error instead of throwing", async () => {
    settle = { data: null, error: { message: "insert denied" }, count: 0 };
    await expect(createNotification({ type: "x", title: "y" })).resolves.toBeUndefined();
  });
});

describe("listNotifications", () => {
  it("returns only the well-formed rows", async () => {
    settle = { data: [VALID_ROW, { garbage: true }, { ...VALID_ROW, id: "b" }], error: null, count: 0 };
    const rows = await listNotifications();
    expect(rows.map((r) => r.id)).toEqual([VALID_ROW.id, "b"]);
  });

  it("throws when the query fails so the route can report it", async () => {
    settle = { data: null, error: { message: "db down" }, count: 0 };
    await expect(listNotifications()).rejects.toThrow("db down");
  });

  it("returns an empty list when there is no data", async () => {
    settle = { data: null, error: null, count: 0 };
    await expect(listNotifications()).resolves.toEqual([]);
  });
});

describe("unreadNotificationCount", () => {
  it("returns the count", async () => {
    settle = { data: null, error: null, count: 7 };
    await expect(unreadNotificationCount()).resolves.toBe(7);
  });

  it("returns 0 when the count is absent", async () => {
    settle = { data: null, error: null, count: 0 };
    await expect(unreadNotificationCount()).resolves.toBe(0);
  });

  it("throws when the query fails", async () => {
    settle = { data: null, error: { message: "db down" }, count: 0 };
    await expect(unreadNotificationCount()).rejects.toThrow("db down");
  });
});

describe("mark read", () => {
  it("marks one notification read with a timestamp and the reader", async () => {
    await markNotificationRead("abc", "admin-1");
    expect(updates).toHaveLength(1);
    expect(updates[0].read_at).toEqual(expect.any(String));
    expect(updates[0].read_by).toBe("admin-1");
  });

  it("records a null reader when the admin id is unknown", async () => {
    await markNotificationRead("abc", null);
    expect(updates[0].read_by).toBeNull();
  });

  it("marks every unread notification read", async () => {
    await markAllNotificationsRead("admin-1");
    expect(updates).toHaveLength(1);
    expect(updates[0].read_at).toEqual(expect.any(String));
    expect(updates[0].read_by).toBe("admin-1");
  });

  it("throws when the update fails", async () => {
    settle = { data: null, error: { message: "denied" }, count: 0 };
    await expect(markAllNotificationsRead("admin-1")).rejects.toThrow("denied");
  });
});
