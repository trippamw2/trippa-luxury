import { NextRequest, NextResponse } from "next/server";
import { romanceEngine, detectOccasion } from "@/lib/ai/romance-engine";

/**
 * POST /api/ai/romance
 * Build an emotional profile for a guest (occasion detection + emotion arc).
 * Body: { text?: string; occasion?: string; name?: string; destinations?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
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
