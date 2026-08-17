"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AdminRole } from "@/lib/admin-permissions";
import { Loader2 } from "lucide-react";

/* ─── Admin profile context ────────────────────────────── */

export interface AdminProfileInfo {
  id: string;
  role: AdminRole;
  effectiveRole: AdminRole;
  permissions: Record<string, unknown>;
}

const AdminProfileContext = createContext<AdminProfileInfo | null>(null);

/** Current staff profile (null until loaded or on the login page). */
export function useAdminProfile(): AdminProfileInfo | null {
  return useContext(AdminProfileContext);
}

/* ─── Guard ────────────────────────────────────────────── */

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Login page has its own layout: skip auth check there.
  const isLoginPage = pathname === "/admin/login";

  const [profile, setProfile] = useState<AdminProfileInfo | null>(null);
  const hasProfile = profile !== null;

  // Derived (not state): once the profile is loaded we are verified.
  const checking = !isLoginPage && !hasProfile;

  useEffect(() => {
    if (isLoginPage || hasProfile) return;

    let cancelled = false;
    // Create client inside the effect: never during render/SSR so the
    // build cannot crash on missing env, and no client per render.
    const supabase = createClient();

    async function checkAuth() {
      const { data } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!data.session) {
        const loginUrl = `/admin/login?redirect=${encodeURIComponent(pathname)}`;
        router.replace(loginUrl);
        return;
      }

      // Session exists — verify it belongs to an active staff account and
      // fetch the profile for role/permission-aware UI.
      try {
        const res = await fetch("/api/admin/auth/me");
        if (cancelled) return;

        if (!res.ok) {
          const loginUrl = `/admin/login?redirect=${encodeURIComponent(pathname)}&error=not-staff`;
          router.replace(loginUrl);
          return;
        }

        const body = (await res.json()) as AdminProfileInfo;
        if (cancelled) return;

        setProfile(body);
      } catch {
        if (cancelled) return;
        const loginUrl = `/admin/login?redirect=${encodeURIComponent(pathname)}&error=auth-failed`;
        router.replace(loginUrl);
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, isLoginPage, hasProfile]);

  if (checking) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex items-center gap-2 text-earth">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Verifying session...</span>
        </div>
      </div>
    );
  }

  return (
    <AdminProfileContext.Provider value={profile}>
      {children}
    </AdminProfileContext.Provider>
  );
}
