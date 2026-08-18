// ─── Kivara Guest Authentication ────────────────────────────────────────
// Lightweight magic-link + OTP authentication for the guest portal.
// Uses Supabase Auth — email only, no SMS.

import { createClient } from "@/lib/supabase/client";

/**
 * Send a magic link (OTP) to the guest's email address.
 * The guest will receive a 6-digit code to verify their identity.
 */
export async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send magic link",
    };
  }
}

/**
 * Verify the OTP code entered by the guest.
 * Returns the session on success.
 */
export async function verifyOtp(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to verify OTP",
    };
  }
}

/**
 * Get the current guest session (if authenticated).
 */
export async function getGuestSession(): Promise<{
  authenticated: boolean;
  email?: string;
}> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      email: session.user.email,
    };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Sign out the current guest.
 */
export async function signOut(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // Silently fail — sign out is best-effort
  }
}
