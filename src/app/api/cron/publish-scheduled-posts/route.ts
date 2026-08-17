import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/cron/publish-scheduled-posts
 *
 * Publishes blog posts whose scheduled_at time has arrived (flips
 * is_published to true and stamps published_at).
 *
 * Auth: Bearer token matching CRON_SECRET env var.
 *
 * Response:
 *   { published: number, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("blog_posts")
      .update({
        is_published: true,
        published_at: now,
        scheduled_at: null,
      })
      .eq("is_published", false)
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", now)
      .select("id, title");

    if (error) {
      console.error("Cron: error publishing scheduled posts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const published = data?.length || 0;

    return NextResponse.json({
      published,
      message: `${published} scheduled post(s) published.`,
    });
  } catch (err: unknown) {
    console.error("Cron: publish-scheduled-posts error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
