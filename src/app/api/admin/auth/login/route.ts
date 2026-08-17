import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loginRateLimiter } from "@/lib/login-rate-limiter";
import { createAuditLog, getIpFromRequest } from "@/lib/audit";
import { resolveEffectiveRole } from "@/lib/admin-permissions";

/**
 * POST /api/admin/auth/login
 *
 * Hardened admin login — performs the sign-in server-side so that:
 *   1. Every attempt is audit-logged (success + failure).
 *   2. A per-IP rate limit locks out brute-force attempts.
 *   3. The Supabase session cookie is established via the @supabase/ssr cookie
 *      helpers (setAll), so the client is authenticated on the redirect.
 *
 * The route deliberately returns a *generic* "Invalid email or password" error
 * whether the email exists or the password is wrong, to avoid user enumeration.
 */
export async function POST(request: NextRequest) {
  const ip = getIpFromRequest(request);
  const client = createClient();

  try {
    const { allowed, retryAfterMs } = loginRateLimiter.check(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${Math.ceil(retryAfterMs / 1000)}s.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = await client;

    const {
      data: { user },
      error: signInError,
    } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !user) {
      loginRateLimiter.recordFailure(ip);

      createAuditLog({
        tableName: "admin_profiles",
        action: "LOGIN_FAILED",
        newData: { email, ipAddress: ip },
        ipAddress: ip,
      });

      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Credentials are valid — verify the account is an active staff member.
    const { data: profile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("id, role, permissions, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || !profile.is_active) {
      // Authenticated but not staff / not active — log them out to clear the
      // session and refuse access.
      await supabase.auth.signOut();
      loginRateLimiter.recordFailure(ip);

      createAuditLog({
        tableName: "admin_profiles",
        action: "LOGIN_FAILED",
        newData: { email, userId: user.id, ipAddress: ip, reason: "not_staff_or_inactive" },
        ipAddress: ip,
      });

      return NextResponse.json(
        { error: "This account does not have admin access." },
        { status: 403 }
      );
    }

    loginRateLimiter.recordSuccess(ip);

    const effectiveRole = resolveEffectiveRole(profile.role, undefined, profile.permissions);

    createAuditLog({
      tableName: "admin_profiles",
      action: "LOGIN_SUCCESS",
      recordId: profile.id,
      newData: { userId: user.id, email, role: profile.role, effectiveRole, ipAddress: ip },
      ipAddress: ip,
    });

    // The session cookie was set by signInWithPassword's setAll side-effect
    // (supabase is the server client with cookie helpers).
    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      profile: {
        id: profile.id,
        role: profile.role,
        effectiveRole,
        permissions: profile.permissions ?? {},
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Login error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
