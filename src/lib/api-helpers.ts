import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError, type AdminAuthOptions } from "@/lib/admin-auth";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";

/** Convert snake_case string to camelCase */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Normalize a nested-select join relation to a single row or null.
 * The untyped Supabase client types FK joins as arrays, but the runtime
 * returns an object for many-to-one relations — this handles both shapes.
 */
export function joinSingle<T>(join: T | T[] | null | undefined): T | null {
  if (Array.isArray(join)) return join[0] ?? null;
  return join ?? null;
}

/** Convert camelCase string to snake_case */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Deep map object keys from snake_case to camelCase */
export function mapKeysToCamel<T = Record<string, unknown>>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => mapKeysToCamel(item)) as unknown as T;
  }
  if (obj === null || typeof obj !== "object") return obj as unknown as T;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = toCamelCase(key);
    result[camelKey] = mapKeysToCamel((obj as Record<string, unknown>)[key]);
  }
  return result as T;
}

/** Deep map object keys from camelCase to snake_case */
export function mapKeysToSnake<T = Record<string, unknown>>(obj: unknown): T {
  if (Array.isArray(obj)) return obj.map((item) => mapKeysToSnake(item)) as unknown as T;
  if (obj === null || typeof obj !== "object") return obj as unknown as T;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = toSnakeCase(key);
    result[snakeKey] = mapKeysToSnake((obj as Record<string, unknown>)[key]);
  }
  return result as T;
}

/**
 * Default module / minimum-role context per table.
 * Custom routes (non-helper) should use `inferAuthForTable` or pass an
 * explicit `requireAdmin({ module, minRole })` call.
 */
const TABLE_AUTH: Record<string, AdminAuthOptions> = {
  // Agent-level: guest-facing operations
  bookings: { module: "bookings", minRole: "agent" },
  booking_suppliers: { module: "bookings", minRole: "agent" },
  inquiries: { module: "inquiries", minRole: "agent" },
  guest_profiles: { module: "guest-profiles", minRole: "agent" },
  guest_communications: { module: "guest-profiles", minRole: "agent" },
  tasks: { module: "tasks", minRole: "agent" },
  // Editor-level: content & operations
  properties: { module: "properties", minRole: "editor" },
  packages: { module: "journeys", minRole: "editor" },
  tours: { module: "tours", minRole: "editor" },
  tour_availability: { module: "tours", minRole: "editor" },
  experiences: { module: "experiences", minRole: "editor" },
  destinations: { module: "destinations", minRole: "editor" },
  suppliers: { module: "suppliers", minRole: "editor" },
  supplier_services: { module: "suppliers", minRole: "editor" },
  supplier_categories: { module: "suppliers", minRole: "editor" },
  blog_posts: { module: "blog", minRole: "editor" },
  media_assets: { module: "media", minRole: "editor" },
  newsletter_subscribers: { module: "marketing", minRole: "editor" },
  testimonials: { module: "content", minRole: "editor" },
  saved_journeys: { module: "journeys", minRole: "editor" },
  property_pricing: { module: "properties", minRole: "editor" },
  // Admin-level: finance, people, platform
  supplier_payouts: { module: "finance", minRole: "admin" },
  transactions: { module: "finance", minRole: "admin" },
  invoices: { module: "finance", minRole: "admin" },
  expenses: { module: "finance", minRole: "admin" },
  expense_categories: { module: "finance", minRole: "admin" },
  payment_methods: { module: "finance", minRole: "admin" },
  admin_profiles: { module: "users", minRole: "admin" },
  platform_settings: { module: "settings", minRole: "admin" },
  audit_log: { module: "audit-log", minRole: "admin" },
};

/** Resolve the auth context for a table, falling back to legacy admin/editor gate. */
export function inferAuthForTable(table: string): AdminAuthOptions {
  return TABLE_AUTH[table] ?? {};
}

type QueryOptions = {
  select?: string;
  orderBy?: { column: string; direction?: "asc" | "desc" };
  limit?: number;
  filters?: Record<string, unknown>;
  range?: { from: number; to: number };
};

/** Generic Supabase query builder */
export async function queryTable(
  table: string,
  options: QueryOptions = {}
) {
  const supabase = createAdminClient();
  let query = supabase.from(table).select(options.select || "*", { count: "exact" });

  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value !== undefined && value !== null && value !== "") {
        query = query.eq(key, value);
      }
    }
  }

  if (options.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.direction !== "desc",
    });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.range) {
    query = query.range(options.range.from, options.range.to);
  }

  return query;
}

/** Handle GET (list) for a resource */
export async function handleGetList(
  table: string,
  request: Request,
  options?: {
    orderBy?: { column: string; direction?: "asc" | "desc" };
    select?: string;
    auth?: AdminAuthOptions;
  }
) {
  try {
    await requireAdmin(options?.auth ?? inferAuthForTable(table));
    const url = new URL(request.url);
    const filters: Record<string, unknown> = {};
    
    // Extract filter params from URL (e.g. ?status=active&destination=zanzibar)
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "limit" && key !== "offset" && key !== "order_by") {
        filters[toSnakeCase(key)] = value;
      }
    }

    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!)
      : undefined;
    const offset = url.searchParams.get("offset")
      ? parseInt(url.searchParams.get("offset")!)
      : undefined;

    const { data, error, count } = await queryTable(table, {
      select: options?.select,
      filters,
      orderBy: options?.orderBy || { column: "created_at", direction: "desc" },
      limit,
      range: offset ? { from: offset, to: offset + (limit || 50) - 1 } : undefined,
    });

    if (error) {
      console.error(`Error fetching ${table}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: mapKeysToCamel(data || []),
      count: count || 0,
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in GET /api/admin/${table}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Handle GET (single) for a resource */
export async function handleGetOne(
  table: string,
  id: string,
  auth?: AdminAuthOptions
) {
  try {
    await requireAdmin(auth ?? inferAuthForTable(table));
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      console.error(`Error fetching ${table}/${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapKeysToCamel(data));
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in GET /api/admin/${table}/${id}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Handle POST (create) for a resource */
export async function handleCreate(
  table: string,
  body: Record<string, unknown>,
  request?: Request,
  auth?: AdminAuthOptions
) {
  try {
    const authResult = await requireAdmin(auth ?? inferAuthForTable(table));
    const supabase = createAdminClient();
    const dbData = mapKeysToSnake(body);

    const { data, error } = await supabase
      .from(table)
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error(`Error creating ${table}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    createAuditLog({
      tableName: table,
      recordId: data?.id,
      action: "CREATE",
      newData: sanitizeForAudit(data),
      performedBy: authResult.profile.id,
      ipAddress: request ? getIpFromRequest(request) : undefined,
    });

    return NextResponse.json(mapKeysToCamel(data), { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in POST /api/admin/${table}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Handle PUT (update) for a resource */
export async function handleUpdate(
  table: string,
  id: string,
  body: Record<string, unknown>,
  request?: Request,
  auth?: AdminAuthOptions
) {
  try {
    const authResult = await requireAdmin(auth ?? inferAuthForTable(table));
    const supabase = createAdminClient();
    const dbData = mapKeysToSnake(body);

    // Fetch old data before updating (for audit trail)
    const { data: oldData } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    // Remove id from update data if present
    delete dbData.id;

    const { data, error } = await supabase
      .from(table)
      .update(dbData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${table}/${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    createAuditLog({
      tableName: table,
      recordId: id,
      action: "UPDATE",
      oldData: sanitizeForAudit(oldData),
      newData: sanitizeForAudit(data),
      performedBy: authResult.profile.id,
      ipAddress: request ? getIpFromRequest(request) : undefined,
    });

    return NextResponse.json(mapKeysToCamel(data));
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in PUT /api/admin/${table}/${id}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Handle DELETE for a resource */
export async function handleDelete(
  table: string,
  id: string,
  request?: Request,
  auth?: AdminAuthOptions
) {
  try {
    const authResult = await requireAdmin(auth ?? inferAuthForTable(table));
    const supabase = createAdminClient();

    // Fetch old data before deleting (for audit trail)
    const { data: oldData } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      console.error(`Error deleting ${table}/${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    createAuditLog({
      tableName: table,
      recordId: id,
      action: "DELETE",
      oldData: sanitizeForAudit(oldData),
      performedBy: authResult.profile.id,
      ipAddress: request ? getIpFromRequest(request) : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in DELETE /api/admin/${table}/${id}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
