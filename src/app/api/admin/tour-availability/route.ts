import { NextRequest } from "next/server";
import { handleGetList, handleCreate } from "@/lib/api-helpers";

const TABLE = "tour_availability";

export async function GET(request: NextRequest) {
  return handleGetList(TABLE, request, { orderBy: { column: "start_date", direction: "asc" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return handleCreate(TABLE, body);
}
