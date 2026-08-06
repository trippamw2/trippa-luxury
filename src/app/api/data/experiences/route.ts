import { NextResponse } from "next/server";
import { getMergedExperiences } from "@/lib/public-data";

export async function GET() {
  try {
    const experiences = await getMergedExperiences();
    return NextResponse.json({ data: experiences, count: experiences.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
