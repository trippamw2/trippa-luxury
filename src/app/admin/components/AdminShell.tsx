"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, User, ChevronDown, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar, HamburgerButton } from "./SidebarProvider";
import { useAdminProfile } from "@/app/admin/AdminAuthGuard";
import type { User as SupabaseUser } from "@supabase/supabase-js";

/* ─── Page title map ──────────────────────────────────── */
const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/destinations": "Destinations",
  "/admin/properties": "Properties",
  "/admin/tours": "Tours & Experiences",
  "/admin/packages": "Packages",
  "/admin/bookings": "Bookings",
  "/admin/inquiries": "Inquiries",
  "/admin/ai-journeys": "AI Journeys",
  "/admin/journeys": "Journey Editor",
  "/admin/guest-profiles": "Guest Profiles",
  "/admin/tasks": "Tasks",
  "/admin/finance": "Finance",
  "/admin/suppliers": "Suppliers",
  "/admin/blog": "Blog & Journal",
  "/admin/marketing": "Marketing",
  "/admin/media": "Media Library",
  "/admin/users": "Users",
  "/admin/settings": "Settings",
  "/admin/analytics": "Analytics",
};

/* ─── Props ───────────────────────────────────────────── */
interface AdminShellProps {
  children: React.ReactNode;
}

/* ─── Component ───────────────────────────────────────── */
export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Create the client inside the effect: never during render/SSR so the
  // build cannot crash on missing env, and no client per render. The client
  // is memoized, so a new one is created on demand instead of held in state.
  useEffect(() => {
    createClient().auth.getUser().then(({ data }: { data: { user: SupabaseUser | null } }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { toggle } = useSidebar();
  const profile = useAdminProfile();

  const handleLogout = async () => {
    createClient().auth.signOut();
    window.location.href = "/admin/login";
  };

  // Determine title and breadcrumbs
  const segments = pathname.split("/").filter(Boolean);
  const currentTitle = PAGE_TITLES[pathname] || segments[segments.length - 1]?.replace(/-/g, " ") || "Admin";

  // Skip for login page
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="flex flex-col min-h-0">
      {/* Header bar */}
      <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-white border-b border-sand-light flex-shrink-0">
        {/* Breadcrumb + Hamburger */}
        <div className="flex items-center gap-2 text-sm">
          <HamburgerButton onClick={toggle} className="lg:hidden" />
          <LayoutDashboard className="w-4 h-4 text-earth hidden sm:block" />
          <span className="text-earth/50 hidden sm:inline">/</span>
          <span className="text-soft-black font-medium">{currentTitle}</span>
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-earth hover:text-soft-black hover:bg-warm-white rounded transition-colors"
          >
            <User className="w-4 h-4" />
            <span className="max-w-[160px] truncate">{user?.email || "Admin"}</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", menuOpen && "rotate-180")} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-sand-light shadow-lg z-50">
              <div className="px-4 py-3 border-b border-sand-light">
                <p className="text-xs text-earth truncate">{user?.email || "Admin user"}</p>
                {user?.user_metadata?.full_name && (
                  <p className="text-sm font-medium text-soft-black truncate">{user.user_metadata.full_name}</p>
                )}
                {profile && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium capitalize border border-gold/40 text-gold bg-gold/5">
                    {profile.role}
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Page content */}
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
