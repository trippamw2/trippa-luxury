import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SupabaseClient = ReturnType<typeof createAdminClient>;

/** Convert snake_case string to camelCase */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Convert camelCase string to snake_case */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Deep map object keys from snake_case to camelCase */
export function mapKeysToCamel<T = any>(obj: Record<string, any>): T {
  if (Array.isArray(obj)) return obj.map((item) => mapKeysToCamel(item)) as any;
  if (obj === null || typeof obj !== "object") return obj as any;
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = toCamelCase(key);
    result[camelKey] = mapKeysToCamel(obj[key]);
  }
  return result as T;
}

/** Deep map object keys from camelCase to snake_case */
export function mapKeysToSnake<T = any>(obj: Record<string, any>): T {
  if (Array.isArray(obj)) return obj.map((item) => mapKeysToSnake(item)) as any;
  if (obj === null || typeof obj !== "object") return obj as any;
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = toSnakeCase(key);
    result[snakeKey] = mapKeysToSnake(obj[key]);
  }
  return result as T;
}

type QueryOptions = {
  select?: string;
  orderBy?: { column: string; direction?: "asc" | "desc" };
  limit?: number;
  filters?: Record<string, any>;
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
  options?: { orderBy?: { column: string; direction?: "asc" | "desc" }; select?: string }
) {
  try {
    const url = new URL(request.url);
    const filters: Record<string, any> = {};
    
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
  } catch (err: any) {
    console.error(`Error in GET /api/admin/${table}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** Handle GET (single) for a resource */
export async function handleGetOne(table: string, id: string) {
  try {
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
  } catch (err: any) {
    console.error(`Error in GET /api/admin/${table}/${id}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** Handle POST (create) for a resource */
export async function handleCreate(table: string, body: Record<string, any>) {
  try {
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

    return NextResponse.json(mapKeysToCamel(data), { status: 201 });
  } catch (err: any) {
    console.error(`Error in POST /api/admin/${table}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** Handle PUT (update) for a resource */
export async function handleUpdate(
  table: string,
  id: string,
  body: Record<string, any>
) {
  try {
    const supabase = createAdminClient();
    const dbData = mapKeysToSnake(body);

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

    return NextResponse.json(mapKeysToCamel(data));
  } catch (err: any) {
    console.error(`Error in PUT /api/admin/${table}/${id}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** Handle DELETE for a resource */
export async function handleDelete(table: string, id: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      console.error(`Error deleting ${table}/${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(`Error in DELETE /api/admin/${table}/${id}:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
