import { NextResponse } from "next/server";
import { getMergedPackages } from "@/lib/public-data";

export async function GET() {
  try {
    const packages = await getMergedPackages();
    return NextResponse.json({ data: packages, count: packages.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
