// ─── Kivara AI Orchestrator API ─────────────────────────────────────────
// Coordinates full inquiry-to-quote pipeline via the AI orchestrator.
// POST  /api/ai/orchestrator  : Process inquiry end-to-end (profile → curate → quote → persist)

import { NextResponse } from "next/server";
import { orchestrator } from "@/lib/ai/orchestrator";
import { workflowPersistence } from "@/lib/workflow-persistence";
import type { ConciergeState } from "@/lib/ai/workflow-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inquiryId, fullName, email, phone, destination, preferredDates, guests, message } = body;

    if (!fullName || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // Run the orchestrator (profiles guest, curates journey, generates quote)
    const result = await orchestrator.processInquiry(
      {
        fullName,
        email,
        phone: phone || undefined,
        message: message || "",
        destination: destination || undefined,
        preferredDates: preferredDates || undefined,
        guests: guests || 2,
      },
      { autoCurate: true, autoQuote: true }
    );

    // Persist workflow to Supabase
    let journey = null;
    if (inquiryId) {
      journey = await workflowPersistence.createFromInquiry(
        inquiryId,
        fullName,
        email,
        phone,
        destination,
        preferredDates,
        guests,
        message
      );
    }

    // If orchestrator reached a state beyond "new", auto-transition the persisted journey
    if (journey && result.state !== "new") {
      const transitionMap: Record<string, string> = {
        qualifying: "concierge_assigned",
        curating: "journey_curated",
        quoted: "quote_sent",
      };

      const action = transitionMap[result.state];
      if (action && journey) {
        const currentState = result.state as ConciergeState;
        const updated = await workflowPersistence.transition(journey.id, currentState, {
          quoteAmount: result.journey?.pricing?.total,
        });
        if (updated) journey = updated;
      }
    }

    return NextResponse.json({
      success: true,
      journeyId: result.journeyId,
      guestProfile: result.guestProfile,
      journey: result.journey,
      state: result.state,
      completedTasks: result.completedTasks,
      pendingTasks: result.pendingTasks,
      errors: result.errors,
      persistedJourney: journey,
    });
  } catch (error) {
    console.error("Orchestrator API error:", error);
    return NextResponse.json({ error: "Orchestration failed" }, { status: 500 });
  }
}
