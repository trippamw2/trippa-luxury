import { NextRequest } from "next/server";
import { handleGetOne, handleUpdate, handleDelete } from "@/lib/api-helpers";

const TABLE = "saved_journeys";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetOne(TABLE, id);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  // Handle status transitions (also set timestamps)
  const updates: Record<string, unknown> = { ...body };
  if (body.status === "sent" && !body.sentAt) updates.sent_at = new Date().toISOString();
  if (body.status === "accepted" && !body.acceptedAt) updates.accepted_at = new Date().toISOString();
  if (body.version) updates.version = body.version;

  return handleUpdate(TABLE, id, updates);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleDelete(TABLE, id);
}
