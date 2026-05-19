import { NextRequest, NextResponse } from "next/server";
import { JourneyEngine } from "@/lib/ai/journey-engine";
import type { CuratedJourney } from "@/lib/ai/types";

const engine = new JourneyEngine();

export async function POST(request: NextRequest) {
  try {
    const body: { journey: CuratedJourney } = await request.json();

    if (!body.journey || !body.journey.id) {
      return NextResponse.json(
        { error: "A valid journey object with an id is required" },
        { status: 400 }
      );
    }

    const alternatives = engine.generateAlternatives(body.journey);

    return NextResponse.json({ alternatives }, { status: 200 });
  } catch (error) {
    console.error("AI alternatives error:", error);
    return NextResponse.json(
      { error: "Failed to generate alternatives." },
      { status: 500 }
    );
  }
}
