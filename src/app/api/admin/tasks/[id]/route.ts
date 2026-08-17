import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog, sanitizeForAudit, getIpFromRequest } from "@/lib/audit";

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
 * PUT    /api/admin/tasks/[id] — update a task (status transitions stamp completed_at).
 * DELETE /api/admin/tasks/[id] — remove a task.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await requireAdmin({ module: "tasks", minRole: "agent" });
    const supabase = createAdminClient();
    const body = await request.json();

    const { data: existing, error: fetchError } = await supabase
      .from(TABLE)
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};

    if (typeof body.title === "string" && body.title.trim()) {
      patch.title = body.title.trim();
    }
    if (typeof body.description === "string") {
      patch.description = body.description.trim() || null;
    }
    if (typeof body.assigneeId === "string") {
      patch.assignee_id = body.assigneeId || null;
    }
    if (typeof body.relatedType === "string") {
      patch.related_type = body.relatedType ? body.relatedType.slice(0, 30) : null;
    }
    if (typeof body.relatedId === "string") {
      patch.related_id = body.relatedId || null;
    }
    if (typeof body.priority === "string" && isTaskPriority(body.priority)) {
      patch.priority = body.priority;
    }
    if (typeof body.dueDate === "string") {
      patch.due_date = body.dueDate || null;
    }
    if (typeof body.status === "string" && isTaskStatus(body.status)) {
      patch.status = body.status;
      // Stamp completion when moving to done; clear when moving away.
      patch.completed_at = body.status === "done" ? new Date().toISOString() : null;
    }

    const { data: task, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq("id", id)
      .select("id, title, description, assignee_id, related_type, related_id, priority, status, due_date, completed_at, created_by, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    createAuditLog({
      tableName: TABLE,
      recordId: id,
      action: "UPDATE",
      oldData: sanitizeForAudit({ id }),
      newData: sanitizeForAudit(patch),
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
    });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in PUT /api/admin/tasks/${id}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await requireAdmin({ module: "tasks", minRole: "agent" });
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from(TABLE)
      .select("id, title")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    createAuditLog({
      tableName: TABLE,
      recordId: id,
      action: "DELETE",
      oldData: sanitizeForAudit({ id: existing.id, title: existing.title }),
      performedBy: auth.profile.id,
      ipAddress: getIpFromRequest(_request),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in DELETE /api/admin/tasks/${id}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
