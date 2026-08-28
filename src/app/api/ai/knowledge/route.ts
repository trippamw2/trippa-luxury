import { NextRequest, NextResponse } from "next/server";
import { getKnowledgeContext, searchProducts } from "@/lib/ai/knowledge";

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
 * server-side agents need it — but it returns only public catalog knowledge
 * (no finances, no customer PII). Rate/firewall protection is handled at the
 * platform edge if deployed publicly.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const destination = params.get("destination") || undefined;
    const mode = params.get("mode");
    const query = params.get("query") || undefined;
    const limitRaw = params.get("limitProducts");
    const limitProducts = limitRaw ? Number(limitRaw) : undefined;

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
