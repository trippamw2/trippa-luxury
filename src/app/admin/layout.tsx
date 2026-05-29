import type { Metadata } from "next";
import { AdminAuthGuard } from "./AdminAuthGuard";
import { ToastProvider } from "./components/Toast";
import { AdminShell } from "./components/AdminShell";
import { SidebarProvider, Sidebar } from "./components/SidebarProvider";

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
    <AdminAuthGuard>
      <SidebarProvider>
      <ToastProvider>
      <div className="min-h-screen bg-cream flex">
        <Sidebar />

        {/* Main Content - offset by sidebar width on desktop */}
        <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          <AdminShell>
            {children}
          </AdminShell>
        </main>
      </div>
      </ToastProvider>
      </SidebarProvider>
    </AdminAuthGuard>
  );
}