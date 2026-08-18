"use client";

export default function GuestPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="border-b border-[#EDE5DA] bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/portal" className="flex items-center gap-3">
            <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "20px", color: "#1A1A1A", letterSpacing: "2px" }}>
              KIVARA
            </h1>
            <span className="text-[10px] text-[#8B7D6B] uppercase tracking-[2px]">Guest Portal</span>
          </a>
          <nav className="flex items-center gap-6 text-xs text-[#8B7D6B] uppercase tracking-[1px]">
            <a href="/portal" className="hover:text-[#C9A96E] transition-colors">Dashboard</a>
            <a href="/portal/documents" className="hover:text-[#C9A96E] transition-colors">Documents</a>
            <button
              onClick={async () => {
                await fetch("/api/guest/auth", { method: "DELETE" });
                window.location.href = "/portal/login";
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
