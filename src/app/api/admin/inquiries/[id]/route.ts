import { NextRequest, NextResponse } from "next/server";
import { handleGetOne, handleUpdate, handleDelete } from "@/lib/api-helpers";

const TABLE = "inquiries";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleGetOne(TABLE, id);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  // Closing an enquiry is a disposition, not a limbo. KORA's recommendation is
  // that 'closed-lost' carry a reason, so reject a close that carries none —
  // otherwise the outcome is inexplicable and the enquiry is indistinguishable
  // from one nobody got to. Accepts either casing since the body is mapped to
  // snake_case downstream.
  if (body.status === "closed") {
    const rawReason = body.lostReason ?? body.lost_reason;
    const reason = typeof rawReason === "string" ? rawReason.trim() : "";
    if (reason === "") {
      return NextResponse.json(
        { error: "A reason is required to close an enquiry as lost." },
        { status: 409 }
      );
    }
  }

  return handleUpdate(TABLE, id, body, request);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleDelete(TABLE, id);
}
