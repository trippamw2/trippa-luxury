import { NextRequest, NextResponse } from "next/server";
import { proposalEngine } from "@/lib/ai/proposal-engine";
import { romanceEngine } from "@/lib/ai/romance-engine";
import type { GuestProfile } from "@/lib/ai/types";
import { clientKey, llmCostLimiter, tooManyRequests } from "@/lib/public-rate-limiter";
import { gateAiAction, ActionBlockedError, actionBlockedResponse } from "@/lib/ai/action-gate";

/**
 * POST /api/ai/proposal
 * Generate a full story-driven proposal (romance profile + curated journey + investment).
 * Body: GuestProfile with optional { text?: string; occasion?: string }
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
    const profile = body.guestProfile as GuestProfile;
    if (!profile?.name || !profile?.email || !profile?.preferences) {
      return NextResponse.json(
        { error: "Missing required fields: guestProfile.name, email, preferences" },
        { status: 400 }
      );
    }

    try {
      await gateAiAction("proposal", {}, { entityType: "guest", entityId: profile.id ?? null });
    } catch (gateError) {
      if (gateError instanceof ActionBlockedError) return actionBlockedResponse(gateError);
      throw gateError;
    }

    const emotion = await romanceEngine.buildEmotionalProfile({
      text: body?.text || "",
      occasion: body?.occasion || undefined,
    });

    const proposal = await proposalEngine.generateProposal(profile, emotion);
    return NextResponse.json({ proposal }, { status: 200 });
  } catch (error) {
    console.error("Proposal generation error:", error);
    return NextResponse.json({ error: "Failed to generate proposal." }, { status: 500 });
  }
}
