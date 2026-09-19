import { handleGetList, handleCreate } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return handleGetList("itinerary_items", request);
}

export async function POST(request: Request) {
  const body = await request.json();
  return handleCreate("itinerary_items", body, request);
}
