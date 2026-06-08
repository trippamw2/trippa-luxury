"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);

  // Login page has its own layout : skip auth check there
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      return;
    }

    let cancelled = false;

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
  }, [pathname, router, supabase, isLoginPage]);

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
