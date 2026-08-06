import { NextResponse } from "next/server";
import { getMergedProperties } from "@/lib/public-data";

export async function GET() {
  try {
    const properties = await getMergedProperties();
    return NextResponse.json({ data: properties, count: properties.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
