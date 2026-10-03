import { NextRequest, NextResponse } from "next/server";
import { romanceEngine, detectOccasion } from "@/lib/ai/romance-engine";
import { clientKey, llmCostLimiter, tooManyRequests } from "@/lib/public-rate-limiter";

/**
 * POST /api/ai/romance
 * Build an emotional profile for a guest (occasion detection + emotion arc).
 * Body: { text?: string; occasion?: string; name?: string; destinations?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
      // Each call reaches a paid LLM, so an unbounded endpoint is a billing
      // denial-of-wallet as much as a security problem.
      const verdict = llmCostLimiter.take(clientKey(request));
      if (!verdict.allowed) {
        return tooManyRequests(verdict.retryAfterSeconds, "Too many requests. Please try again shortly.");
      }
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text : "";

    const detection = body?.occasion
      ? { occasion: body.occasion, confidence: 0.8 }
      : detectOccasion(text);

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
