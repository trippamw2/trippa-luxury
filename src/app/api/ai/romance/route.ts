import { NextRequest, NextResponse } from "next/server";
import { romanceEngine, detectOccasion } from "@/lib/ai/romance-engine";
import { clientKey, llmCostLimiter, tooManyRequests } from "@/lib/public-rate-limiter";
import { gateAiAction, ActionBlockedError, actionBlockedResponse } from "@/lib/ai/action-gate";

/**
 * POST /api/ai/romance
 * Build an emotional profile for a guest (occasion detection + emotion arc).
 * Body: { text?: string; occasion?: string; name?: string; destinations?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
      // Each call reaches a paid LLM, so an unbounded endpoint is a billing
      // denial-of-wallet as much as a security problem.
      const verdict = await llmCostLimiter.take(clientKey(request));
      if (!verdict.allowed) {
        return tooManyRequests(verdict.retryAfterSeconds, "Too many requests. Please try again shortly.");
      }
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text : "";

    const detection = body?.occasion
      ? { occasion: body.occasion, confidence: 0.8 }
      : detectOccasion(text);

    // Gated after occasion detection so the ledger can record what was being
    // written about, but before the model call that costs money to produce it.
    try {
      await gateAiAction("romance", {}, { entityType: "narrative", entityId: null });
    } catch (gateError) {
      if (gateError instanceof ActionBlockedError) return actionBlockedResponse(gateError);
      throw gateError;
    }

    const profile = await romanceEngine.buildEmotionalProfile({
      text,
      occasion: body?.occasion || undefined,
    });

    return NextResponse.json({ profile, detection }, { status: 200 });
  } catch (error) {
    console.error("Romance intelligence error:", error);
    return NextResponse.json({ error: "Failed to build emotional profile." }, { status: 500 });
  }
}
