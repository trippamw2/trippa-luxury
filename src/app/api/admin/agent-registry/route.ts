import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { getAllAgents, getAgentsByDepartment, registerAgent } from "@/lib/ai/agent-registry";

/**
 * GET /api/admin/agent-registry?department=finance
 * POST /api/admin/agent-registry  { spec: AgentSpec }
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin({ module: "analytics", minRole: "editor" });
    const department = request.nextUrl.searchParams.get("department") || undefined;
    const agents = department ? getAgentsByDepartment(department) : getAllAgents();
    return NextResponse.json({ agents });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin({ module: "analytics", minRole: "admin" });
    const body = await request.json();
    if (!body?.spec?.name) {
      return NextResponse.json({ error: "Missing spec.name" }, { status: 400 });
    }
    const agents = registerAgent(body.spec);
    return NextResponse.json({ agents }, { status: 201 });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
