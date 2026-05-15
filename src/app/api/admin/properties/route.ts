import { NextRequest } from "next/server";
import { handleGetList, handleCreate } from "@/lib/api-helpers";

const TABLE = "properties";

export async function GET(request: NextRequest) {
  return handleGetList(TABLE, request, { orderBy: { column: "name", direction: "asc" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return handleCreate(TABLE, body);
}
