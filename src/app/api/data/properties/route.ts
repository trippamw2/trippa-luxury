import { NextResponse } from "next/server";
import { getMergedProperties } from "@/lib/public-data";

export async function GET() {
  try {
    const properties = await getMergedProperties();
    return NextResponse.json({ data: properties, count: properties.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
