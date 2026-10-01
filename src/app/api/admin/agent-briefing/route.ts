import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import {
  analyticalAgentNames,
  isAnalyticalAgent,
  runAnalyticalAgents,
  type AnalyticalAgentName,
} from "@/lib/ai/agents";
import { agentRuntimeCensus } from "@/lib/ai/agent-runtime";
import { KIVARA_AGENTS } from "@/lib/ai/agent-registry";

/**
 * GET /api/admin/agent-briefing
 *
 * The live invocation path for all 22 analytical agents.
 *
 *   (no query)          -> every agent, plus the honesty census
 *   ?agent=<name>       -> one agent
 *   ?census=1           -> runtime census only, no snapshot read
 *
 * The census is included on every full response on purpose. The briefing is the
 * page most likely to be screenshotted and forwarded, and a report that renders
 * 22 agent results without saying "none of these can act on their own" is how
 * the overclaim gets back in.
 *
 * Every agent here is recommend-only. Reading a report is a safe operation;
 * none of these agents can send, book, charge or publish anything, so this route
 * is `minRole: "editor"` rather than admin.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin({ module: "analytics", minRole: "editor" });

    const url = new URL(request.url);
    const census = agentRuntimeCensus(KIVARA_AGENTS.map((a) => a.name));

    if (url.searchParams.get("census") === "1") {
      return NextResponse.json({ census });
    }

    const agent = url.searchParams.get("agent");
    if (agent !== null) {
      if (!isAnalyticalAgent(agent)) {
        return NextResponse.json(
          {
            error: `Unknown analytical agent: ${agent}`,
            available: analyticalAgentNames(),
          },
          { status: 404 }
        );
      }
      const [report] = Object.values(await runAnalyticalAgents([agent]));
      return NextResponse.json({ census, report });
    }

    // One snapshot read serves all 22 agents.
    const reports = (await runAnalyticalAgents()) as Record<AnalyticalAgentName, unknown>;

    // Surface the agents that found a blocker first: on a founder-facing briefing
    // the operational blockers matter more than the alphabetical remainder.
    const blockers = Object.entries(reports)
      .filter(([, r]) => (r as { findings?: { blockers?: unknown[] } }).findings?.blockers?.length)
      .map(([name]) => name);

    return NextResponse.json({
      census,
      agentCount: analyticalAgentNames().length,
      agentsRequiringHumanApproval: Object.values(reports)
        .filter((r) => (r as { requiresHumanApproval?: boolean }).requiresHumanApproval)
        .map((r) => (r as { agent: string }).agent),
      agentsWithUnavailableData: Object.values(reports)
        .filter((r) => (r as { dataAvailability?: string }).dataAvailability === "unavailable")
        .map((r) => (r as { agent: string }).agent),
      agentsWithBlockers: blockers,
      reports,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/agent-briefing
 *
 * Body: { agents?: string[] } to run a named subset.
 *
 * Rejected as a 400 rather than silently ignored, so a typo in an agent name
 * cannot look like an agent that produced no findings.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin({ module: "analytics", minRole: "editor" });
    const body = (await request.json().catch(() => ({}))) as { agents?: unknown };

    if (body.agents === undefined) {
      return NextResponse.json(await runAnalyticalAgents());
    }
    if (!Array.isArray(body.agents)) {
      return NextResponse.json({ error: "agents must be an array of agent names" }, { status: 400 });
    }

    const unknownNames = (body.agents as string[]).filter((n) => !isAnalyticalAgent(n));
    if (unknownNames.length > 0) {
      return NextResponse.json(
        {
          error: `Unknown analytical agent(s): ${unknownNames.join(", ")}`,
          available: analyticalAgentNames(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      await runAnalyticalAgents(body.agents as AnalyticalAgentName[])
    );
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
