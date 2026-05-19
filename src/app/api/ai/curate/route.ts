import { NextRequest, NextResponse } from "next/server";
import { JourneyEngine } from "@/lib/ai/journey-engine";
import type { GuestProfile } from "@/lib/ai/types";

const engine = new JourneyEngine();

export async function POST(request: NextRequest) {
  try {
    const body: GuestProfile = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.preferences) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, preferences" },
        { status: 400 }
      );
    }

    const journey = engine.generate({
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
