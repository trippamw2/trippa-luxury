import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import { aiLab, type Experiment } from "@/lib/ai/ai-lab";

/**
 * GET /api/admin/ai-lab?category=model   → list experiments
 * GET /api/admin/ai-lab?view=monthly     → monthly prompt
 * GET /api/admin/ai-lab?view=suggested   → suggested experiments catalogue
 * POST /api/admin/ai-lab                 → logExperiment { title, category, hypothesis, status, notes? }
 * PATCH /api/admin/ai-lab                → updateStatus { id, status }
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin({ module: "analytics", minRole: "editor" });
    const view = request.nextUrl.searchParams.get("view");
    if (view === "monthly") {
      return NextResponse.json({ prompt: aiLab.monthlyPrompt() });
    }
    if (view === "suggested") {
      return NextResponse.json({ suggested: aiLab.suggestedExperiments() });
    }
    const category = request.nextUrl.searchParams.get("category") as Experiment["category"] | null;
    const experiments = aiLab.listExperiments(category || undefined);
    return NextResponse.json({ experiments });
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
    if (!body?.title || !body?.category || !body?.hypothesis) {
      return NextResponse.json({ error: "Missing title, category, hypothesis" }, { status: 400 });
    }
    const experiment = aiLab.logExperiment({
      title: body.title,
      category: body.category,
      hypothesis: body.hypothesis,
      status: body.status || "idea",
      notes: body.notes,
    });
    return NextResponse.json({ experiment }, { status: 201 });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin({ module: "analytics", minRole: "editor" });
    const body = await request.json();
    if (!body?.id || !body?.status) {
      return NextResponse.json({ error: "Missing id, status" }, { status: 400 });
    }
    const experiment = aiLab.updateStatus(body.id, body.status);
    if (!experiment) return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
    return NextResponse.json({ experiment });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
