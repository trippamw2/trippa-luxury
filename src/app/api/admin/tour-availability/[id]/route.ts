import { NextRequest } from "next/server";
import { handleGetOne, handleUpdate, handleDelete } from "@/lib/api-helpers";

const TABLE = "tour_availability";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetOne(TABLE, id);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return handleUpdate(TABLE, id, body);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleDelete(TABLE, id);
}
