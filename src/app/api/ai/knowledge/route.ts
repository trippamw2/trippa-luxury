import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeContext, searchProducts } from "@/lib/ai/knowledge";
import { clientKey, llmCostLimiter, tooManyRequests } from "@/lib/public-rate-limiter";
import { gateAiAction, ActionBlockedError, actionBlockedResponse } from "@/lib/ai/action-gate";

/**
 * GET /api/ai/knowledge
 * Retrieves the Kivara knowledge base for AI agents.
 *
 * Query params:
 *   - destination   (optional) narrow to a single destination slug
 *   - limitProducts (optional) cap the number of products returned
 *   - query         (optional) free-form guest context / question to embed
 *   - mode=search   (optional) run keyword product search instead
 *
 * This endpoint exists to ground agent responses in real, on-brand data. It is
 * intentionally NOT gated behind admin auth because the orchestrator and other
 * server-side agents need it â€” but it returns only public catalog knowledge
 * (no finances, no customer PII). Rate/firewall protection is handled at the
 * platform edge if deployed publicly.
 */
export async function GET(request: NextRequest) {
  try {
      // Each call reaches a paid LLM, so an unbounded endpoint is a billing
      // denial-of-wallet as much as a security problem.
      const verdict = await llmCostLimiter.take(clientKey(request));
      if (!verdict.allowed) {
        return tooManyRequests(verdict.retryAfterSeconds, "Too many requests. Please try again shortly.");
      }
    const params = request.nextUrl.searchParams;
    const destination = params.get("destination") || undefined;
    const mode = params.get("mode");
    const query = params.get("query") || undefined;
    const limitRaw = params.get("limitProducts");
    const limitProducts = limitRaw ? Number(limitRaw) : undefined;

    // This is a read path, so the verdict is not written to the ledger: a lookup
    // is not an action, and logging every retrieval would bury the entries that
    // record something actually happening. The dial is still enforced.
    try {
      await gateAiAction("knowledge", {}, { entityType: "knowledge", record: false });
    } catch (gateError) {
      if (gateError instanceof ActionBlockedError) return actionBlockedResponse(gateError);
      throw gateError;
    }

    if (mode === "search" && query) {
      const results = await searchProducts(query, {
        destination,
        limit: limitProducts,
      });
      return NextResponse.json({ results }, { status: 200 });
    }

    const context = await getKnowledgeContext({
      destination,
      limitProducts,
      query,
    });

    return NextResponse.json(context, { status: 200 });
  } catch (error) {
    console.error("Knowledge retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve knowledge" },
      { status: 500 }
    );
  }
}
