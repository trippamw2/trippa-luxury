import { NextRequest, NextResponse } from "next/server";
import { handleGetOne, handleUpdate, handleDelete } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/admin-auth";
import {
  registerBookingFromProposal,
  registerProposalReviewStage,
} from "@/lib/pipeline/register";

const TABLE = "proposals";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetOne(TABLE, id);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  // Status transitions also set timestamps (mirrors the journeys route).
  const updates: Record<string, unknown> = { ...body };
  if (body.status === "sent" && !body.sentAt) updates.sent_at = new Date().toISOString();
  if (body.status === "accepted" && !body.acceptedAt) updates.accepted_at = new Date().toISOString();
  if (body.status === "declined" && !body.declinedAt) updates.declined_at = new Date().toISOString();

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