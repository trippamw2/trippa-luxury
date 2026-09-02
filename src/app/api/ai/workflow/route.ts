// ─── Kivara Workflow API (Supabase-backed) ───────────────────────────────
// Manages the full client lifecycle : state transitions, search, CRUD.
// GET    /api/ai/workflow  : List journeys with filters
// POST   /api/ai/workflow  : Create journey or transition state
// DELETE /api/ai/workflow  : Delete a journey

import { NextRequest, NextResponse } from "next/server";
import { workflowEngine, type ConciergeState, type WorkflowAction } from "@/lib/ai/workflow-engine";
import { workflowPersistence } from "@/lib/workflow-persistence";

// ─── GET: List journeys ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") || "all";
    const search = searchParams.get("search") || undefined;
    const assignedTo = searchParams.get("assignedTo") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    const result = await workflowPersistence.list({
      state: state as ConciergeState | "all",
      search,
      assignedTo,
      limit,
      offset,
    });

    return NextResponse.json({
      data: result.data,
      count: result.count,
    });
  } catch (error) {
    console.error("Workflow GET error:", error);
    return NextResponse.json({ error: "Failed to list workflows" }, { status: 500 });
  }
}

// ─── POST: Create or transition ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, journeyId, ...payload } = body as {
      action: WorkflowAction;
      journeyId?: string;
      inquiryId?: string;
      clientName?: string;
      email?: string;
      phone?: string;
      destination?: string;
      preferredDates?: string;
      guests?: number;
      notes?: string;
      assignedTo?: string;
      quoteAmount?: number;
      amount?: number;
      itineraryUrl?: string;
      travelStart?: string;
      travelEnd?: string;
    };

    // Map action to target state
    const actionStateMap: Record<WorkflowAction, ConciergeState> = {
      enquiry_received: "new",
      concierge_assigned: "qualifying",
      journey_curated: "curating",
      quote_sent: "quoted",
      client_reviewed: "reviewing",
      quote_approved: "provisional",
      deposit_paid: "deposit-paid",
      balance_paid: "confirmed",
      itinerary_delivered: "itinerary-sent",
      travel_started: "in-progress",
      travel_completed: "completed",
      follow_up_sent: "follow-up",
      client_reviewed_followup: "follow-up",
      archived: "archived",
    };

    // ── CREATE: enquiry_received without journeyId → new journey ──
    if (action === "enquiry_received" && !journeyId) {
      const journey = await workflowPersistence.createFromInquiry(
        payload.inquiryId || "",
        payload.clientName || "Unknown Client",
        payload.email || "",
        payload.phone,
        payload.destination,
        payload.preferredDates,
        payload.guests,
        payload.notes
      );
      if (!journey) {
        return NextResponse.json({ error: "Failed to create journey" }, { status: 500 });
      }
      return NextResponse.json({ journey }, { status: 201 });
    }

    // ── TRANSITION: Existing journey ──
    if (!journeyId) {
      return NextResponse.json({ error: "journeyId is required for state transitions" }, { status: 400 });
    }

    const targetState = actionStateMap[action];
    if (!targetState) {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Fetch current journey to validate transition
    const current = await workflowPersistence.get(journeyId);
    if (!current) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Validate transition
    if (!workflowEngine.canTransition(current.state, targetState)) {
      return NextResponse.json(
        { error: `Cannot transition from '${current.state}' to '${targetState}'` },
        { status: 400 }
      );
    }

    // Build metadata for the transition
    const metadata: Record<string, unknown> = {};
    if (action === "concierge_assigned" && payload.assignedTo) {
      metadata.assignedTo = payload.assignedTo;
    }
    if (action === "quote_sent") {
      metadata.quoteAmount = payload.quoteAmount;
    }
    if (action === "deposit_paid") {
      metadata.depositAmount = payload.amount;
    }
    if (action === "balance_paid") {
      metadata.balanceAmount = payload.amount;
    }
    if (action === "itinerary_delivered") {
      metadata.itineraryUrl = payload.itineraryUrl;
    }
    if (action === "travel_started") {
      metadata.travelStart = payload.travelStart;
    }
    if (action === "travel_completed") {
      metadata.travelEnd = payload.travelEnd;
    }
    if (payload.notes) {
      metadata.internalNotes = payload.notes;
    }

    const updated = await workflowPersistence.transition(journeyId, targetState, metadata);
    if (!updated) {
      return NextResponse.json({ error: "Failed to update journey" }, { status: 500 });
    }

    // LLM-assisted next-step advice for the concierge (graceful fallback).
    const nextStep = await workflowEngine.suggestNextStep(targetState, {
      clientName: current.clientName,
      destination: current.destination,
    });

    return NextResponse.json({ journey: updated, nextStep });
  } catch (error) {
    console.error("Workflow POST error:", error);
    return NextResponse.json({ error: "Failed to process workflow action" }, { status: 500 });
  }
}

// ─── DELETE: Remove journey ─────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = (await import("@/lib/supabase/admin")).createAdminClient();
    const { error } = await supabase.from("bookings").delete().eq("id", id);

    if (error) {
      console.error("Workflow DELETE error:", error);
      return NextResponse.json({ error: "Failed to delete journey" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Workflow DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete journey" }, { status: 500 });
  }
}
