import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | Kivara",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream flex">
      {/* Left Sidebar - always visible */}
      <aside className="w-64 min-h-screen bg-soft-black text-cream fixed left-0 top-0 bottom-0 overflow-y-auto">
        <div className="p-6 border-b border-white/5">
          <img src="/images/kivara-logo-light.svg" alt="Kivara" className="h-10 w-auto max-w-[200px] object-contain" />
          <span className="block text-[10px] text-earth-light tracking-widest uppercase mt-2">Admin Panel</span>
        </div>
        <nav className="p-4 space-y-1">
          {[
            { label: "Dashboard", href: "/admin" },
            { label: "Destinations", href: "/admin/destinations" },
            { label: "Properties", href: "/admin/properties" },
            { label: "Tours & Experiences", href: "/admin/tours" },
            { label: "Packages", href: "/admin/packages" },
            { label: "Bookings", href: "/admin/bookings" },
            { label: "Inquiries", href: "/admin/inquiries" },
            { label: "Finance", href: "/admin/finance" },
            { label: "Suppliers", href: "/admin/suppliers" },
            { label: "Blog", href: "/admin/blog" },
            { label: "Media Library", href: "/admin/media" },
            { label: "Users", href: "/admin/users" },
            { label: "Analytics", href: "/admin/analytics" },
            { label: "Settings", href: "/admin/settings" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-4 py-2.5 text-sm text-earth-light hover:text-cream hover:bg-white/5 rounded transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <a href="/" className="block text-xs text-earth-light hover:text-cream transition-colors">
            ← Back to Website
          </a>
        </div>
      </aside>

      {/* Main Content - offset by sidebar width */}
      <main className="flex-1 ml-64">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}