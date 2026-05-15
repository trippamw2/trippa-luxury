import { NextRequest } from "next/server";
import { handleGetList, handleCreate } from "@/lib/api-helpers";

const TABLE = "transactions";

export async function GET(request: NextRequest) {
  return handleGetList(TABLE, request, { orderBy: { column: "transaction_date", direction: "desc" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return handleCreate(TABLE, body);
}
