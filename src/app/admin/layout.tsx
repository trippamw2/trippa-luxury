import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | Trippa",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-soft-black text-cream hidden lg:block">
          <div className="p-6 border-b border-white/5">
            <span className="text-xl font-heading font-bold tracking-wider">Trippa</span>
            <span className="block text-[10px] text-earth-light tracking-widest uppercase mt-1">Admin Panel</span>
          </div>
          <nav className="p-4 space-y-1">
            {[
              { label: "Dashboard", href: "/admin" },
              { label: "Properties", href: "/admin/properties" },
              { label: "Packages", href: "/admin/packages" },
              { label: "Inquiries", href: "/admin/inquiries" },
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
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
            <a href="/" className="block text-xs text-earth-light hover:text-cream transition-colors">
              &larr; Back to Website
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
