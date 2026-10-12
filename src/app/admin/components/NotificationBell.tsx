"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const POLL_MS = 60_000;

/**
 * Admin notification bell. Reads the feed from `/api/admin/notifications`,
 * shows an unread badge, and marks items read on open. Degrades silently when
 * the endpoint is unreachable — a broken bell must never break the admin chrome.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?limit=20");
      if (!res.ok) return;
      const json = (await res.json()) as { data?: FeedItem[]; unread?: number };
      setItems(Array.isArray(json.data) ? json.data : []);
      setUnread(typeof json.unread === "number" ? json.unread : 0);
    } catch {
      // Ignore: the bell is best-effort.
    }
  }, []);

  useEffect(() => {
    // Deferred off the effect body so no state is set synchronously during the
    // commit; the poll then keeps the badge fresh without blocking paint.
    const timer = setInterval(() => void load(), POLL_MS);
    const kick = setTimeout(() => void load(), 0);
    return () => {
      clearInterval(timer);
      clearTimeout(kick);
    };
  }, [load]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } finally {
      await load();
    }
  };

  const openItem = async (item: FeedItem) => {
    if (!item.readAt) {
      try {
        await fetch("/api/admin/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });
      } catch {
        // Ignore: navigate anyway.
      }
    }
    setOpen(false);
    if (item.link) {
      router.push(item.link);
    } else {
      await load();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex items-center justify-center w-8 h-8 text-earth hover:text-soft-black hover:bg-warm-white rounded transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-gold rounded-full">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-h-[420px] overflow-y-auto bg-white border border-sand-light shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-sand-light">
            <span className="text-xs font-medium text-soft-black">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-gold hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-xs text-earth text-center">No notifications yet.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-sand-light/60 hover:bg-warm-white transition-colors",
                      !item.readAt && "bg-gold/5"
                    )}
                  >
                    <p className="text-sm text-soft-black font-medium truncate">{item.title}</p>
                    {item.body && (
                      <p className="text-xs text-earth/80 line-clamp-2 mt-0.5">{item.body}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
