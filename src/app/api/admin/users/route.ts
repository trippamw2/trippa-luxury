import { NextRequest } from "next/server";
import { handleGetList, handleCreate } from "@/lib/api-helpers";

const TABLE = "admin_profiles";

export async function GET(request: NextRequest) {
  return handleGetList(TABLE, request, { orderBy: { column: "full_name", direction: "asc" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return handleCreate(TABLE, body);
}
