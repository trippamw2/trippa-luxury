import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Canonical domain — all traffic redirects here */
const CANONICAL_HOST = "kivarajourneys.com";

/** Domains that should redirect to the canonical host */
const ALIAS_HOSTS = new Set(["kivara.com", "www.kivara.com", "www.kivarajourneys.com"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";

  // Strip port number for comparison (e.g. "localhost:3000" → "localhost")
  const host = hostname.split(":")[0].toLowerCase();

  // ── Domain redirect ────────────────────────────────────────────────
  if (
    host !== "localhost" &&
    !host.endsWith(".vercel.app") &&
    host !== CANONICAL_HOST &&
    ALIAS_HOSTS.has(host)
  ) {
    const url = new URL(request.url);
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, { status: 301 });
  }

  // ── Admin page protection ──────────────────────────────────────────
  // Only protect admin pages (not API routes — those use requireAdmin())
  // Exclude the login page itself and static assets under /admin/
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/_next") &&
    !pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js)$/)
  ) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Read-only in the proxy — we only check, never set cookies here
          },
        },
      }
    );

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files, _next, and API routes
    "/((?!_next/static|_next/image|favicon.ico|images/|videos/|fonts/).*)",
  ],
};
