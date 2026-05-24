import { NextResponse } from "next/server";
import { getMergedDestinations } from "@/lib/public-data";

export async function GET() {
  try {
    const destinations = await getMergedDestinations();
    return NextResponse.json({ data: destinations, count: destinations.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
