"use client";

import { useState } from "react";
import { Send, Check } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

/**
 * Unsubscribe form for /unsubscribe. Wired to DELETE /api/newsletter, which is
 * intentionally unauthenticated so recipients can opt out without an account
 * (CAN-SPAM / GDPR requirement). The endpoint always answers success, so the
 * UI never discloses whether the address was on the list.
 */
export function UnsubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unsubscribe failed");
      setStatus("success");
      setMessage(data.message || "You have been unsubscribed.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unsubscribe failed. Please try again.");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          required
          className="flex-1 px-5 py-3.5 bg-transparent border border-earth/40 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors duration-300"
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gold text-soft-black text-sm font-medium tracking-[0.15em] uppercase hover:bg-gold-dark transition-all duration-500 disabled:opacity-70"
        >
          {status === "loading" ? (
            <span className="w-4 h-4 border-2 border-soft-black border-t-transparent rounded-full animate-spin" />
          ) : status === "success" ? (
            <>
              <Check className="w-4 h-4" />
              Done
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Unsubscribe
            </>
          )}
        </button>
      </div>
      {message && (
        <p
          role="status"
          className={`mt-4 text-sm ${status === "error" ? "text-red-700" : "text-earth"}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
