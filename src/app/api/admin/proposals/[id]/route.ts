import { NextRequest, NextResponse } from "next/server";
import { handleUpdate, handleDelete, joinSingle, mapKeysToCamel } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, AdminAuthError } from "@/lib/admin-auth";
import {
  registerBookingFromProposal,
  registerProposalReviewStage,
} from "@/lib/pipeline/register";

const TABLE = "proposals";

/**
 * The detail view shows the customer's and journey's names, so both are joined
 * here rather than returning bare foreign-key ids. Matches the list route.
 */
const SELECT_WITH_RELATIONS =
  "*, leads(full_name, email, phone), journeys(journey_name, slug)";

type ProposalRow = Record<string, unknown> & {
  leads?: { full_name?: string; email?: string; phone?: string } | null;
  journeys?: { journey_name?: string; slug?: string } | null;
};

function mapRow(item: ProposalRow) {
  const lead = joinSingle(item.leads);
  const journey = joinSingle(item.journeys);
  return {
    ...mapKeysToCamel(item),
    customerName: lead?.full_name ?? null,
    customerEmail: lead?.email ?? null,
    customerPhone: lead?.phone ?? null,
    journeyName: journey?.journey_name ?? null,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireAdmin({ module: "proposals", minRole: "agent" });
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select(SELECT_WITH_RELATIONS)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      console.error(`Error fetching ${TABLE}/${id}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapRow(data as ProposalRow));
  } catch (err: unknown) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Error in GET /api/admin/${TABLE}/${id}:`, err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  // Status transitions also set timestamps (mirrors the journeys route).
  // `proposals` owns `sent_date` / `viewed_date` / `accepted_date` — it has no
  // `sent_at` / `accepted_at` / `declined_at`, and writing those keys made every
  // status change fail the insert. There is no declined timestamp column at all,
  // so a decline records the status alone. A caller-supplied value wins.
  const updates: Record<string, unknown> = { ...body };
  if (body.status === "sent" && !body.sentDate && !body.sent_date) {
    updates.sent_date = new Date().toISOString();
  }
  if (body.status === "accepted" && !body.acceptedDate && !body.accepted_date) {
    updates.accepted_date = new Date().toISOString();
  }
  delete updates.sent_at;
  delete updates.accepted_at;
  delete updates.declined_at;

  const response = await handleUpdate(TABLE, id, updates);
  if (response.status !== 200) return response;

  // Automated pipeline: proposal draft -> human review (ready) -> approval
  // (sent) -> provisional booking. Never fails the status transition; each
  // step is best-effort and returns its own errors for logging.
  let actorId: string | null = null;
  try {
    const auth = await requireAdmin({ module: "proposals", minRole: "agent" });
    actorId = auth.profile.id;
  } catch {
    // handleUpdate above already enforced auth; an unknown actor degrades
    // the ADMIN_APPROVED event to anonymous rather than failing the update.
  }

  const review =
    body.status === "ready" || body.status === "sent"
      ? await registerProposalReviewStage(id, body.status, { actorId })
      : null;
  if (review?.error) {
    console.error("Review stage registration issue:", review.error);
  }

  if (body.status !== "sent") {
    if (review) {
      const updated = await response.clone().json();
      return NextResponse.json({
        ...updated,
        reviewRequested: review.reviewRequested,
        adminApproved: review.adminApproved,
        pipelineRegistered: review.registered,
        pipelineError: review.error,
      });
    }
    return response;
  }

  // Automated pipeline: proposal sent -> provisional booking (via journey and
  // lead). Never fails the status transition; errors are logged and surfaced.
  const result = await registerBookingFromProposal(id);
  if (result.error) {
    console.error("Booking registration issue:", result.error);
  }

  const updated = await response.clone().json();
  return NextResponse.json({
    ...updated,
    bookingId: result.bookingId,
    bookingReference: result.bookingReference,
    pipelineRegistered: result.registered,
    pipelineError: result.error,
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleDelete(TABLE, id);
}