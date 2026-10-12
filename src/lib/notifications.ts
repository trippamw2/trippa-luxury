// ─── Admin notifications ─────────────────────────────────────────────────
// The in-app feed behind the admin bell. Server code calls `createNotification`
// at a handful of high-signal moments (a new inquiry, a new booking, a received
// payment); the admin UI reads and marks rows read over
// `/api/admin/notifications`.
//
// Two properties matter and are enforced here:
//   1. TELEMETRY NEVER BREAKS A FLOW. `createNotification` swallows its own
//      failure and logs it, exactly like the event bus. A missed notification is
//      an inconvenience; a failed inquiry because the bell could not be updated
//      is not.
//   2. THE BOUNDARY IS VALIDATED. Postgres returns `unknown`-shaped rows (this
//      project has no generated DB types), so rows are parsed rather than cast.

import { createAdminClient } from "@/lib/supabase/admin";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationInput {
  /** e.g. "inquiry_created", "booking_created", "payment_received". */
  type: string;
  title: string;
  body?: string | null;
  /** Admin-relative deep link, e.g. "/admin/inquiries". */
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

/** Narrow a raw row; returns null for anything untrustworthy. */
export function parseNotificationRow(raw: unknown): NotificationRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || r.id === "") return null;
  if (typeof r.type !== "string" || r.type === "") return null;
  if (typeof r.title !== "string" || r.title === "") return null;

  return {
    id: r.id,
    type: r.type,
    title: r.title,
    body: typeof r.body === "string" ? r.body : null,
    link: typeof r.link === "string" ? r.link : null,
    entityType: typeof r.entity_type === "string" ? r.entity_type : null,
    entityId: typeof r.entity_id === "string" ? r.entity_id : null,
    readAt: typeof r.read_at === "string" ? r.read_at : null,
    createdAt: typeof r.created_at === "string" ? r.created_at : "",
  };
}

/**
 * Record a notification. Never throws: instrumentation that can fail the flow it
 * instruments is instrumentation nobody turns on.
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("notifications").insert({
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
    });
    if (error) console.error("Failed to create notification:", error.message);
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

/** Newest-first page of the feed. */
export async function listNotifications(limit = 50): Promise<NotificationRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, entity_type, entity_id, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? [])
    .map(parseNotificationRow)
    .filter((row): row is NotificationRow => row !== null);
}

/** Count of unread rows — the bell badge. */
export async function unreadNotificationCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Mark one notification read. Idempotent: an already-read row is left as is. */
export async function markNotificationRead(id: string, adminId: string | null): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString(), read_by: adminId })
    .eq("id", id)
    .is("read_at", null);

  if (error) throw new Error(error.message);
}

/** Mark every unread notification read. */
export async function markAllNotificationsRead(adminId: string | null): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString(), read_by: adminId })
    .is("read_at", null);

  if (error) throw new Error(error.message);
}
