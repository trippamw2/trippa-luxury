// ─── Kivara Prospect Profiling API ───────────────────────────────────────
// Standalone guest profiling + lead scoring from raw inquiry text.
// POST  /api/ai/prospect  : Profile a guest and score their lead

import { NextResponse } from "next/server";
import { guestProfiler, type RawInquiry, type ProfiledGuest } from "@/lib/ai/guest-profiler";
import { clientKey, llmCostLimiter, tooManyRequests } from "@/lib/public-rate-limiter";

export async function POST(request: Request) {
  try {
    // Each call reaches a paid LLM, so an unbounded endpoint is a billing
    // denial-of-wallet as much as a security problem.
    const verdict = llmCostLimiter.take(clientKey(request));
    if (!verdict.allowed) {
      return tooManyRequests(verdict.retryAfterSeconds, "Too many requests. Please try again shortly.");
    }
    const body = await request.json();
    const { name, email, phone, destination, preferredDates, guests, message } = body;

    if (!message) {
      return NextResponse.json({ error: "Message text is required for profiling" }, { status: 400 });
    }

    const raw: RawInquiry = {
      fullName: name || "Unknown",
      email: email || "unknown@email.com",
      phone: phone || undefined,
      message,
      destination: destination || undefined,
      preferredDates: preferredDates || undefined,
      guests: guests || 2,
    };

    const profile: ProfiledGuest = await guestProfiler.llmProfile(raw);

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        isCouple: profile.isCouple,
        specialOccasion: profile.specialOccasion,
        preferences: profile.preferences,
        leadScore: profile.leadScore,
        leadTier: profile.leadTier,
        destinations: profile.extractedDestinations,
      },
    });
  } catch (error) {
    console.error("Prospect API error:", error);
    return NextResponse.json({ error: "Failed to profile guest" }, { status: 500 });
  }
}
