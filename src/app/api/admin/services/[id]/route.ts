import { NextRequest } from "next/server";
import { handleGetOne, handleUpdate, handleDelete } from "@/lib/api-helpers";

// Single-service CRUD. The list/create route (../route.ts) only ever exposed
// GET + POST, so a service could be created but never read back, edited or
// removed from the admin UI — the "Add Service" button was the only working
// action and nothing downstream could touch the row again. These handlers close
// that gap using the shared helpers so auth (module "services", minRole
// "editor" via TABLE_AUTH), snake↔camel mapping and the audit-log write stay
// identical to every other admin resource.
const TABLE = "services";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleGetOne(TABLE, id);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  return handleUpdate(TABLE, id, body, request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleDelete(TABLE, id, request);
}
