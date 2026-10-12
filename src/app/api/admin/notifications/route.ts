import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import {
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";

/**
 * GET   /api/admin/notifications — the feed page plus the unread badge count.
 * PATCH /api/admin/notifications — mark one (`{ id }`) or all (`{ all: true }`)
 *                                   notifications read.
 *
 * Every signed-in admin may read their own feed, so this is guarded at the
 * lowest module level rather than admin-only.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin({ module: "dashboard", minRole: "agent" });

    const limitParam = Number(new URL(request.url).searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;

    const [notifications, unread] = await Promise.all([
      listNotifications(limit),
      unreadNotificationCount(),
    ]);

    return NextResponse.json({ data: notifications, unread });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/notifications:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { profile } = await requireAdmin({ module: "dashboard", minRole: "agent" });
    const body = await request.json().catch(() => ({}));
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

    if (record.all === true) {
      await markAllNotificationsRead(profile.id);
      return NextResponse.json({ success: true, all: true });
    }

    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "A notification id, or all: true, is required" }, { status: 400 });
    }

    await markNotificationRead(id, profile.id);
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in PATCH /api/admin/notifications:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
