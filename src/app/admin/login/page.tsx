"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { ADMIN_LAST_ACTIVE_KEY } from "@/lib/admin-idle";

const REASON_MESSAGES: Record<string, string> = {
  idle: "You were signed out after a period of inactivity. Sign in again to continue.",
  "not-staff": "That account is no longer active staff. Contact an administrator.",
  "auth-failed": "Your session could not be verified. Sign in again.",
  "password-updated": "Your password has been updated. Sign in with your new password.",
};

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reasonMessage = REASON_MESSAGES[searchParams.get("error") ?? ""] ?? null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Authenticate via the hardened server-side login route so every attempt
      // is rate-limited and audit-logged. The session cookie is established
      // server-side (via @supabase/ssr cookie helpers) on success.
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json().catch(() => ({ error: "Request failed" }));

      if (!res.ok) {
        throw new Error(body.error || "Invalid email or password");
      }

      // Fresh activity stamp: a stale value from a previous browser session
      // must not make the new session look idle the moment it starts.
      try {
        window.localStorage.setItem(ADMIN_LAST_ACTIVE_KEY, String(Date.now()));
      } catch {
        // Storage disabled: the in-memory timer still applies.
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-heading font-bold text-soft-black tracking-tight">
            Kivara
          </h1>
          <p className="text-sm text-earth mt-1">Admin Panel</p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-sand-light/50 p-8 space-y-5"
        >
          <div className="text-center">
            <h2 className="text-lg font-medium text-soft-black">Sign In</h2>
            <p className="text-xs text-earth mt-1">
              Enter your credentials to access the admin panel.
            </p>
          </div>

          {/* Error / notice */}
          {(error ?? reasonMessage) && (
            <div
              className={
                !error && searchParams.get("error") === "password-updated"
                  ? "flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm"
                  : "flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm"
              }
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error ?? reasonMessage}</span>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-soft-black mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kivara.africa"
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors bg-white"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-soft-black mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-sand-light/50 text-sm focus:outline-none focus:border-gold transition-colors bg-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-earth hover:text-soft-black transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-soft-black text-cream text-sm font-medium hover:bg-soft-black-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-earth mt-6">
          kivara.africa &mdash; Admin Access Only
        </p>
      </div>
    </div>
  );
}
