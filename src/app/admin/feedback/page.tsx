"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/admin/components/Toast";

interface FeedbackRow {
  id: string;
  clientName: string | null;
  npsScore: number | null;
  sentiment: string | null;
  wouldRecommend: boolean | null;
  createdAt: string;
  published: boolean;
  quote: string | null;
}

export default function AdminFeedbackPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "published">("pending");
  const [publishing, setPublishing] = useState<string | null>(null);
  const [quote, setQuote] = useState("");
  const [guestName, setGuestName] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [tripSummary, setTripSummary] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/feedback?status=${tab}`);
      const json = await res.json();
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function publish(id: string) {
    if (!quote.trim()) {
      toast("Quote is required", "error");
      return;
    }
    setPublishing(id);
    try {
      const res = await fetch(`/api/admin/feedback/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote, guestName: guestName || undefined, tripSummary: tripSummary || undefined, rating }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Publish failed");
      toast("Published", "success");
      setOpenId(null);
      setQuote("");
      setGuestName("");
      setTripSummary("");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Publish failed", "error");
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-heading text-soft-black mb-6">Feedback review</h1>
      <div className="flex gap-2 mb-6 border-b border-sand-light pb-2">
        <button onClick={() => setTab("pending")} className={`px-4 py-2 text-sm font-medium rounded ${tab === "pending" ? "bg-soft-black text-cream" : "text-earth hover:bg-sand-light"}`}>Pending</button>
        <button onClick={() => setTab("published")} className={`px-4 py-2 text-sm font-medium rounded ${tab === "published" ? "bg-soft-black text-cream" : "text-earth hover:bg-sand-light"}`}>Published</button>
      </div>

      {loading ? (
        <p className="text-earth">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-earth">No {tab} feedback.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="bg-white border border-sand-light/50 rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-soft-black">{r.clientName || "Guest"}</p>
                <span className="text-xs text-earth">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-earth mb-2">NPS: {r.npsScore ?? "—"} · {r.sentiment ?? "—"} · {r.wouldRecommend ? "would recommend" : "—"}</p>
              {r.quote && <p className="text-sm text-soft-black italic mb-3">“{r.quote}”</p>}
              {tab === "pending" && (
                <>
                  {openId === r.id ? (
                    <div className="space-y-3 mt-3">
                      <textarea value={quote} onChange={(e) => setQuote(e.target.value)} rows={3} placeholder="Quote (required)" className="w-full border border-sand-light/50 rounded px-3 py-2 text-sm" />
                      <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name (optional)" className="w-full border border-sand-light/50 rounded px-3 py-2 text-sm" />
                      <input value={tripSummary} onChange={(e) => setTripSummary(e.target.value)} placeholder="Trip summary (optional)" className="w-full border border-sand-light/50 rounded px-3 py-2 text-sm" />
                      <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border border-sand-light/50 rounded px-3 py-2 text-sm">
                        {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <div className="flex gap-3">
                        <button onClick={() => publish(r.id)} disabled={publishing === r.id} className="px-4 py-2 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-colors disabled:opacity-40">
                          {publishing === r.id ? "Publishing…" : "Publish"}
                        </button>
                        <button onClick={() => setOpenId(null)} className="px-4 py-2 text-sm text-earth hover:text-soft-black">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setOpenId(r.id); setQuote(r.quote ?? ""); setGuestName(r.clientName ?? ""); }} className="text-xs text-gold hover:underline">Publish</button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}