"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_LAST_ACTIVE_KEY,
  IDLE_WARNING_SECONDS,
  idleTimeoutMs,
  isIdleExpired,
  secondsUntilIdleLogout,
} from "@/lib/admin-idle";

/**
 * Interaction events that count as "still here". Pointer moves and scrolling
 * are enough on their own; reading without touching anything is the case this
 * policy is designed for.
 */
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"] as const;

/** How often the idle clock is evaluated while the tab is open. */
const CHECK_INTERVAL_MS = 5_000;

/** localStorage writes are throttled: pointermove fires dozens of times a second. */
const PERSIST_INTERVAL_MS = 5_000;

/**
 * Signs the staff console out after `NEXT_PUBLIC_ADMIN_IDLE_MINUTES` without
 * interaction (default 30, see `@/lib/admin-idle`).
 *
 * Supabase refresh tokens otherwise keep the session alive forever, so the
 * timer has to live in the client. The last-activity timestamp is shared
 * through localStorage so activity in a second tab keeps every tab signed in,
 * and a tab reopened hours later is treated as idle rather than fresh.
 */
export function AdminIdleWatcher() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expiring, setExpiring] = useState(false);

  const timeoutMsRef = useRef(idleTimeoutMs(process.env.NEXT_PUBLIC_ADMIN_IDLE_MINUTES));
  const lastActiveRef = useRef(0);
  const lastPersistRef = useRef(0);
  const warnedRef = useRef(false);
  const expiringRef = useRef(false);

  const expire = useCallback(() => {
    if (expiringRef.current) return;
    expiringRef.current = true;
    setExpiring(true);
    try {
      window.localStorage.removeItem(ADMIN_LAST_ACTIVE_KEY);
    } catch {
      // Private mode / storage disabled: the in-memory timer still logs out.
    }
    void (async () => {
      try {
        await createClient().auth.signOut();
      } catch {
        // Cookie clearing is best-effort; the redirect below still ends the UI session.
      }
      router.replace("/admin/login?error=idle");
    })();
  }, [router]);

  const markActive = useCallback(() => {
    if (expiringRef.current) return;
    const now = Date.now();
    lastActiveRef.current = now;
    if (now - lastPersistRef.current > PERSIST_INTERVAL_MS) {
      lastPersistRef.current = now;
      try {
        window.localStorage.setItem(ADMIN_LAST_ACTIVE_KEY, String(now));
      } catch {
        // Ignore storage failures; activity still resets this tab's timer.
      }
    }
    if (warnedRef.current) {
      warnedRef.current = false;
      setSecondsLeft(0);
    }
  }, []);

  const evaluate = useCallback(() => {
    if (expiringRef.current) return;
    const timeoutMs = timeoutMsRef.current;
    const now = Date.now();
    if (isIdleExpired(lastActiveRef.current, now, timeoutMs)) {
      expire();
      return;
    }
    const seconds = secondsUntilIdleLogout(lastActiveRef.current, now, timeoutMs);
    if (seconds <= IDLE_WARNING_SECONDS) {
      warnedRef.current = true;
      setSecondsLeft(seconds);
    } else if (warnedRef.current) {
      warnedRef.current = false;
      setSecondsLeft(0);
    }
  }, [expire]);

  useEffect(() => {
    // A tab reopened after the window elapsed is idle, not active. Rolling the
    // timer forward here would let a stolen/dormant tab live forever.
    let initialStamp = Date.now();
    try {
      const raw = window.localStorage.getItem(ADMIN_LAST_ACTIVE_KEY);
      const stored = raw ? Number(raw) : 0;
      if (Number.isFinite(stored) && stored > 0 && stored <= Date.now()) {
        initialStamp = stored;
      }
    } catch {
      // Keep the in-memory value.
    }
    lastActiveRef.current = initialStamp;

    // Deferred so the first evaluation is never a synchronous setState in an
    // effect body (react-hooks/set-state-in-effect).
    const initial = window.setTimeout(evaluate, 0);
    const timer = window.setInterval(evaluate, CHECK_INTERVAL_MS);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== ADMIN_LAST_ACTIVE_KEY) return;
      // Another tab hit the idle timeout and cleared the shared stamp: these
      // tabs share the same auth cookies, so they must all end their session.
      if (!event.newValue) {
        expire();
        return;
      }
      const stamp = Number(event.newValue);
      if (!Number.isFinite(stamp) || stamp <= 0) return;
      lastActiveRef.current = stamp;
      if (warnedRef.current) {
        warnedRef.current = false;
        setSecondsLeft(0);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") evaluate();
    };

    ACTIVITY_EVENTS.forEach((name) =>
      window.addEventListener(name, markActive, { passive: true })
    );
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, markActive));
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [evaluate, markActive, expire]);

  if (!expiring && secondsLeft <= 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-5 right-5 z-[80] w-full max-w-sm border border-gold/40 bg-white p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold" />
        <div className="flex-1">
          <p className="text-sm font-medium text-soft-black">Still there?</p>
          <p className="mt-1 text-xs text-earth">
            {expiring
              ? "Signing you out for security…"
              : `You will be signed out in ${secondsLeft} second${secondsLeft === 1 ? "" : "s"} because the console has been idle.`}
          </p>
          {!expiring && (
            <button
              type="button"
              onClick={markActive}
              className="mt-3 bg-soft-black px-3 py-1.5 text-xs font-medium text-cream transition-colors hover:bg-soft-black-light"
            >
              Stay signed in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
