"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { KivaraLogo } from "@/components/ui/KivaraLogo";
import { isModuleAllowed } from "@/lib/admin-permissions";
import { useAdminProfile } from "@/app/admin/AdminAuthGuard";

/* ─── Context ─────────────────────────────────────────── */

interface SidebarContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

/* ─── Provider ────────────────────────────────────────── */

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (mobile). Done via render-phase state
  // adjustment (React-documented pattern) instead of an effect to avoid a
  // synchronous setState-in-effect cascade.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

/* ─── Sidebar Component ───────────────────────────────── */

// Workflow-ordered: Inquiries → Journeys → Bookings → Finance → Operations → Content → Marketing → Admin
const NAV_ITEMS = [
  // ── Sales Pipeline ──────────────────────────────────────────────────
  { label: "Dashboard", href: "/admin", module: "dashboard" },
  { label: "Founder Dashboard", href: "/admin/founder", module: "dashboard" },
  { label: "Inquiries", href: "/admin/inquiries", module: "inquiries" },
  { label: "AI Journeys", href: "/admin/ai-journeys", module: "journeys" },
  { label: "Journey Editor", href: "/admin/journeys", module: "journeys" },
  { label: "Bookings", href: "/admin/bookings", module: "bookings" },
  { label: "Finance", href: "/admin/finance", module: "finance" },
  // ── Guest Operations ────────────────────────────────────────────────
  { label: "Guest Profiles", href: "/admin/guest-profiles", module: "guest-profiles" },
  { label: "Tasks", href: "/admin/tasks", module: "tasks" },
  // ── Content Management ──────────────────────────────────────────────
  { label: "Destinations", href: "/admin/destinations", module: "destinations" },
  { label: "Properties", href: "/admin/properties", module: "properties" },
  { label: "Tours & Experiences", href: "/admin/tours", module: "tours" },
  { label: "Packages", href: "/admin/packages", module: "packages" },
  // ── Marketing ───────────────────────────────────────────────────────
  { label: "Blog", href: "/admin/blog", module: "blog" },
  { label: "Marketing", href: "/admin/marketing", module: "marketing" },
  { label: "Media Library", href: "/admin/media", module: "media" },
  // ── Intelligence ────────────────────────────────────────────────────
  { label: "Market Intelligence", href: "/admin/intelligence", module: "analytics" },
  { label: "Platform Health", href: "/admin/platform-intelligence", module: "analytics" },
  { label: "AI Lab", href: "/admin/ai-lab", module: "analytics" },
  { label: "Agent Registry", href: "/admin/agent-registry", module: "analytics" },
  // ── Administration ──────────────────────────────────────────────────
  { label: "Suppliers", href: "/admin/suppliers", module: "suppliers" },
  { label: "Users", href: "/admin/users", module: "users" },
  { label: "Settings", href: "/admin/settings", module: "settings" },
  { label: "Audit Log", href: "/admin/audit-log", module: "audit-log" },
  { label: "Analytics", href: "/admin/analytics", module: "analytics" },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  agent: "Agent",
};

export function Sidebar() {
  const { isOpen, close } = useSidebar();
  const profile = useAdminProfile();

  const visibleItems = profile
    ? NAV_ITEMS.filter((item) => isModuleAllowed(profile.role, profile.permissions, item.module))
    : NAV_ITEMS;

  const sidebarContent = (
    <div className="flex flex-col min-h-screen">
      <div className="p-6 border-b border-white/5">
        <KivaraLogo variant="light" className="h-10 w-auto max-w-[200px]" />
        <span className="block text-[10px] text-earth-light tracking-widest uppercase mt-2">
          Admin Panel
        </span>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="block px-4 py-2.5 text-sm text-earth-light hover:text-cream hover:bg-white/5 rounded transition-colors"
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div className="p-4 border-t border-white/5 space-y-2">
        {profile && (
          <p className="text-[11px] text-earth-light/70">
            Signed in as <span className="text-cream/80 capitalize">{ROLE_LABEL[profile.role] || profile.role}</span>
          </p>
        )}
        <Link
          href="/"
          className="block text-xs text-earth-light hover:text-cream transition-colors"
        >
          ← Back to Website
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar : always visible */}
      <aside className="hidden lg:flex lg:flex-col w-64 min-h-screen bg-soft-black text-cream fixed left-0 top-0 bottom-0 overflow-y-auto z-30">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar : drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-soft-black/60 backdrop-blur-sm"
            onClick={close}
          />
          {/* Drawer */}
          <aside className="relative w-72 max-w-[85vw] min-h-screen bg-soft-black text-cream overflow-y-auto animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

/* ─── Hamburger Button ────────────────────────────────── */

interface HamburgerProps {
  onClick: () => void;
  className?: string;
}

export function HamburgerButton({ onClick, className }: HamburgerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center w-9 h-9 text-earth hover:text-soft-black hover:bg-warm-white rounded transition-colors",
        className
      )}
      aria-label="Toggle sidebar"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M3 5h14" />
        <path d="M3 10h14" />
        <path d="M3 15h14" />
      </svg>
    </button>
  );
}
