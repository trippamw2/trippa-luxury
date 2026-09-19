import { handleGetList, handleCreate } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return handleGetList("leads", request);
}

export async function POST(request: Request) {
  const body = await request.json();
  return handleCreate("leads", body, request);
}
