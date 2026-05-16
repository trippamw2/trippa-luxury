import { NextResponse } from "next/server";
import { getMergedBlogPosts } from "@/lib/public-data";

export async function GET() {
  try {
    const posts = await getMergedBlogPosts();
    return NextResponse.json({ data: posts, count: posts.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
