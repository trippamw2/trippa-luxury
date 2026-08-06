import { NextResponse } from "next/server";
import { getMergedDestinations } from "@/lib/public-data";

export async function GET() {
  try {
    const destinations = await getMergedDestinations();
    return NextResponse.json({ data: destinations, count: destinations.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
