import { NextRequest, NextResponse } from "next/server";
import { handleGetOne, handleUpdate, handleDelete } from "@/lib/api-helpers";
import { registerBookingFromProposal } from "@/lib/pipeline/register";

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
  if (body.status !== "sent") return response;

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