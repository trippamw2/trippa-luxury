import { NextResponse } from "next/server";
import { getMergedPackages } from "@/lib/public-data";

export async function GET() {
  try {
    const packages = await getMergedPackages();
    return NextResponse.json({ data: packages, count: packages.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
