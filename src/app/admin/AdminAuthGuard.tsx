"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Login page has its own layout: skip auth check there. `checking` starts
  // false on the login page and is re-derived on route changes (render-phase
  // state adjustment per React docs — no setState inside the effect body).
  const isLoginPage = pathname === "/admin/login";
  const [checking, setChecking] = useState(!isLoginPage);
  const [prevIsLoginPage, setPrevIsLoginPage] = useState(isLoginPage);
  if (isLoginPage !== prevIsLoginPage) {
    setPrevIsLoginPage(isLoginPage);
    setChecking(!isLoginPage);
  }

  useEffect(() => {
    if (isLoginPage) return;

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

      setChecking(false);
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, isLoginPage]);

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

  return <>{children}</>;
}
