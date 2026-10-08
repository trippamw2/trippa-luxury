import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientKey, guestOtpLimiter } from "@/lib/public-rate-limiter";

/**
 * POST /api/guest/auth
 * Send magic link (OTP) or verify OTP code.
 *
 * Body: { email: string } — sends OTP
 * Body: { email: string, token: string } — verifies OTP
 *
 * DELETE /api/guest/auth
 * Sign out the guest.
 */
export async function POST(request: NextRequest) {
  try {
    // Covers both send and verify: sends deliver email to caller-chosen
    // addresses (bombing risk), verifies are code guesses (brute-force risk).
    const verdict = await guestOtpLimiter.take(clientKey(request));
    if (!verdict.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { email, token } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await createClient();

    if (token) {
      // Verify OTP
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      return NextResponse.json({ success: true });
    }

    // Send OTP
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/guest/auth — Sign out.
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
