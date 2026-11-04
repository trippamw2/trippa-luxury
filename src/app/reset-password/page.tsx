"use client";

import { Suspense, useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, Eye, EyeOff, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { ADMIN_LAST_ACTIVE_KEY } from "@/lib/admin-idle";

/**
 * Staff password setup.
 *
 * Supabase invite and recovery links redirect here with a one-time session.
 * The page lets the account owner choose a password, signs the temporary
 * session out, and returns them to the admin login with a confirmation.
 *
 * Deliberately outside `/admin`: the admin layout's auth guard would bounce a
 * session that is still being established from the URL token.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

type Status = "checking" | "ready" | "invalid";

const MIN_PASSWORD_LENGTH = 8;

function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const settle = (hasSession: boolean) => {
      if (!cancelled) setStatus(hasSession ? "ready" : "invalid");
    };

    // The browser client consumes `#access_token` / `?code` from the URL. Give
    // it a moment, then check for the session the link established.
    async function check() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch {
          // Already exchanged by the client initialiser: the session check
          // below is the source of truth.
        }
      }
      const { data } = await supabase.auth.getSession();
      settle(Boolean(data.session));
    }

    void check();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
          settle(true);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      try {
        window.localStorage.removeItem(ADMIN_LAST_ACTIVE_KEY);
      } catch {
        // Storage disabled: nothing to clear.
      }

      await supabase.auth.signOut();
      router.replace("/admin/login?error=password-updated");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "The password could not be updated.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-heading font-bold text-soft-black tracking-tight">Kivara</h1>
          <p className="text-sm text-earth mt-1">Staff console</p>
        </div>

        <div className="bg-white border border-sand-light/50 p-8 space-y-5">
          {status === "checking" ? (
            <div className="flex items-center justify-center gap-2 py-6 text-earth">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Checking your link...</span>
            </div>
          ) : status === "invalid" ? (
            <>
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  This link is invalid or has expired. Ask an administrator to send a new invite or
                  password link.
                </span>
              </div>
              <Link
                href="/admin/login"
                className="block w-full py-2.5 bg-soft-black text-cream text-sm font-medium text-center hover:bg-soft-black-light transition-colors"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center">
                <KeyRound className="w-8 h-8 text-gold mx-auto mb-2" />
                <h2 className="text-lg font-medium text-soft-black">Choose a password</h2>
                <p className="text-xs text-earth mt-1">
                  At least {MIN_PASSWORD_LENGTH} characters. You will sign in with it afterwards.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-soft-black mb-1">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-earth hover:text-soft-black transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-soft-black mb-1">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save password"
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-earth mt-6">Staff access only</p>
      </div>
    </div>
  );
}
