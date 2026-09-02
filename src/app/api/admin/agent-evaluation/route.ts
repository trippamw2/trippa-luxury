import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { agentEvaluation } from "@/lib/ai/agent-evaluation";

/**
 * Admin Agent Evaluation API.
 * GET /api/admin/agent-evaluation?agent=NAME  → list events + metrics + optional LLM insight
 * POST /api/admin/agent-evaluation             → record an AgentEvent
 * Body: { agent, type, meta?: { promptTokens?, completionTokens?, latencyMs?, revenue? } }
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin({ module: "analytics", minRole: "editor" });
    const agent = request.nextUrl.searchParams.get("agent") || undefined;

    const events = agentEvaluation.listEvents(agent);

    // Quantitative metrics always available; LLM insight layered on top for
    // named-agent requests (admin dashboard latency is acceptable here).
    const insight = agent ? await agentEvaluation.evaluateWithInsight(agent) : null;

    return NextResponse.json({
      events,
      metrics: insight?.metrics ?? null,
      insight: insight?.insight || null,
    });
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
    await requireAdmin({ module: "analytics", minRole: "editor" });
    const body = await request.json();
    const event = agentEvaluation.recordEvent({
      agent: body?.agent,
      type: body?.type,
      meta: body?.meta,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
