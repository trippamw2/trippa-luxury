import { NextResponse } from "next/server";
import { getMergedBlogPosts } from "@/lib/public-data";

export async function GET() {
  try {
    const posts = await getMergedBlogPosts();
    return NextResponse.json({ data: posts, count: posts.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
