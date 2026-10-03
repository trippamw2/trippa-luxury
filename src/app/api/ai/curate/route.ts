import { NextRequest, NextResponse } from "next/server";
import { JourneyEngine } from "@/lib/ai/journey-engine";
import type { GuestProfile } from "@/lib/ai/types";
import { clientKey, llmCostLimiter, tooManyRequests } from "@/lib/public-rate-limiter";
import { gateAiAction, ActionBlockedError, actionBlockedResponse } from "@/lib/ai/action-gate";

const engine = new JourneyEngine();

export async function POST(request: NextRequest) {
  try {
      // Each call reaches a paid LLM, so an unbounded endpoint is a billing
      // denial-of-wallet as much as a security problem.
      const verdict = await llmCostLimiter.take(clientKey(request));
      if (!verdict.allowed) {
        return tooManyRequests(verdict.retryAfterSeconds, "Too many requests. Please try again shortly.");
      }
    const body: GuestProfile = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.preferences) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, preferences" },
        { status: 400 }
      );
    }

    try {
      await gateAiAction("curate", {}, { entityType: "guest", entityId: body.id ?? null });
    } catch (gateError) {
      if (gateError instanceof ActionBlockedError) return actionBlockedResponse(gateError);
      throw gateError;
    }

    const journey = await engine.llmGenerate({
      ...body,
      id: body.id || `guest-${Date.now()}`,
      isCouple: body.isCouple ?? true,
      preferences: {
        travelStyle: body.preferences.travelStyle || "mixed",
        accommodationStyle: body.preferences.accommodationStyle || "luxury-resort",
        activityLevel: body.preferences.activityLevel || "moderate",
        budgetRange: body.preferences.budgetRange || "premium",
        dietaryRestrictions: body.preferences.dietaryRestrictions || [],
        interests: body.preferences.interests || [],
      },
      createdAt: new Date().toISOString(),
    } as GuestProfile);

    return NextResponse.json({ journey }, { status: 200 });
  } catch (error) {
    console.error("AI curation error:", error);
    return NextResponse.json(
      { error: "Failed to generate journey. Please check your input." },
      { status: 500 }
    );
  }
}
