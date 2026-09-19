import { handleGetList, handleCreate } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return handleGetList("lead_activities", request);
}

export async function POST(request: Request) {
  const body = await request.json();
  return handleCreate("lead_activities", body, request);
}
