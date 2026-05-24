import { NextResponse } from "next/server";
import { getMergedExperiences } from "@/lib/public-data";

export async function GET() {
  try {
    const experiences = await getMergedExperiences();
    return NextResponse.json({ data: experiences, count: experiences.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
