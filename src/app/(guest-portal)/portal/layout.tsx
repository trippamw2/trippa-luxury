"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function GuestPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="border-b border-[#EDE5DA] bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/portal" className="flex items-center gap-3">
            <span className="font-heading text-xl tracking-[2px] text-[#1A1A1A]">
              KIVARA
            </span>
            <span className="text-[10px] text-[#8B7D6B] uppercase tracking-[2px]">Guest Portal</span>
          </Link>
          <nav className="flex items-center gap-6 text-xs text-[#8B7D6B] uppercase tracking-[1px]">
            <Link href="/portal" className="hover:text-[#C9A96E] transition-colors">Dashboard</Link>
            <Link href="/portal/documents" className="hover:text-[#C9A96E] transition-colors">Documents</Link>
            <button
              onClick={async () => {
                await fetch("/api/guest/auth", { method: "DELETE" });
                router.push("/portal/login");
              }}
              className="hover:text-[#C9A96E] transition-colors"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
