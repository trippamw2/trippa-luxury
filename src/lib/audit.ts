import { createAdminClient } from "@/lib/supabase/admin";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

type AuditEntry = {
  tableName: string;
  recordId?: string;
  action: AuditAction;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  performedBy?: string;
  ipAddress?: string;
};

/**
 * Insert an audit log entry directly using the admin client (bypasses RLS).
 */
export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from("audit_log").insert({
      table_name: entry.tableName,
      record_id: entry.recordId,
      action: entry.action,
      old_data: entry.oldData ?? null,
      new_data: entry.newData ?? null,
      performed_by: entry.performedBy ?? null,
      ip_address: entry.ipAddress ?? null,
    });
  } catch (err) {
    // Audit failures should never break the calling operation
    console.error("Failed to write audit log:", err);
  }
}

/**
 * Strip sensitive/irrelevant fields from data before logging.
 * Keeps the record identifiable without storing large blobs.
 */
export function sanitizeForAudit(
  data: Record<string, any> | null | undefined
): Record<string, any> | null {
  if (!data) return null;
  const excluded = [
    "id",
    "created_at",
    "updated_at",
    "password_hash",
    "password",
    "token",
    "secret",
  ];
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!excluded.includes(key)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Extract client IP from a Request object.
 */
export function getIpFromRequest(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
