import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";
import { joinSingle } from "@/lib/api-helpers";

const TABLE = "tasks";

const TASK_STATUSES = ["todo", "in_progress", "done", "cancelled"] as const;
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

function isTaskStatus(v: string): v is (typeof TASK_STATUSES)[number] {
  return (TASK_STATUSES as readonly string[]).includes(v);
}
function isTaskPriority(v: string): v is (typeof TASK_PRIORITIES)[number] {
  return (TASK_PRIORITIES as readonly string[]).includes(v);
}

/**
 * GET  /api/admin/tasks?status=todo — list tasks with assignee/creator names.
 * POST /api/admin/tasks            — create a task.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin({ module: "tasks", minRole: "agent" });
    const supabase = createAdminClient();

    const status = request.nextUrl.searchParams.get("status");
    const filterStatus = status && isTaskStatus(status) ? status : null;

    let query = supabase
      .from(TABLE)
      .select("*, assignee:admin_profiles!tasks_assignee_id_fkey(full_name), creator:admin_profiles!tasks_created_by_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filterStatus) {
      query = query.eq("status", filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (data ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        assigneeId: t.assignee_id,
        assigneeName: joinSingle(t.assignee)?.full_name ?? null,
        relatedType: t.related_type,
        relatedId: t.related_id,
        priority: t.priority,
        status: t.status,
        dueDate: t.due_date,
        completedAt: t.completed_at,
        createdBy: t.created_by,
        createdByName: joinSingle(t.creator)?.full_name ?? null,
        createdAt: t.created_at,
      })),
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/admin/tasks:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin({ module: "tasks", minRole: "agent" });
    const supabase = createAdminClient();
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const assigneeId = typeof body.assigneeId === "string" ? body.assigneeId : null;
    const relatedType = typeof body.relatedType === "string" && body.relatedType ? body.relatedType.slice(0, 30) : null;
    const relatedId = typeof body.relatedId === "string" && body.relatedId ? body.relatedId : null;
    const priority = typeof body.priority === "string" && isTaskPriority(body.priority) ? body.priority : "medium";
    const status = typeof body.status === "string" && isTaskStatus(body.status) ? body.status : "todo";
    const dueDate = typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data: task, error } = await supabase
      .from(TABLE)
      .insert({
        title,
        description,
        assignee_id: assigneeId,
        related_type: relatedType,
        related_id: relatedId,
        priority,
        status,
        due_date: dueDate,
        completed_at: status === "done" ? new Date().toISOString() : null,
        created_by: auth.profile.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    createAuditLog({
      tableName: TABLE,
      recordId: task.id,
      action: "CREATE",
      newData: sanitizeForAudit(task),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(request),
    });

    return NextResponse.json({
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        assigneeId: task.assignee_id,
        assigneeName: null,
        relatedType: task.related_type,
        relatedId: task.related_id,
        priority: task.priority,
        status: task.status,
        dueDate: task.due_date,
        completedAt: task.completed_at,
        createdBy: task.created_by,
        createdByName: null,
        createdAt: task.created_at,
      },
    }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in POST /api/admin/tasks:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
