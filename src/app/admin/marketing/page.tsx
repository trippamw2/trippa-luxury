"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Send, Users, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/app/admin/components/Toast";
import { SkeletonText } from "@/app/admin/components/Skeleton";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { FormInput, FormTextarea } from "@/app/admin/components/FormField";

interface Subscriber {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt?: string | null;
}

interface NewsletterStats {
  count: number;
  activeCount: number;
}

const NEWSLETTER_ENDPOINT = "/api/admin/marketing/newsletter";

export default function AdminMarketing() {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<NewsletterStats>({ count: 0, activeCount: 0 });
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);

  const loadNewsletter = useCallback(async () => {
    const res = await fetch(NEWSLETTER_ENDPOINT);
    if (!res.ok) return;
    const json = await res.json();
    setSubscribers(json.data || []);
    setStats({ count: json.count || 0, activeCount: json.activeCount || 0 });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await loadNewsletter();
      } catch {
        /* non-critical */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [loadNewsletter]);

  const handleSend = async () => {
    if (!subject.trim() || !bodyHtml.trim()) {
      toast("Subject and message body are required.", "error");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(NEWSLETTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), bodyHtml: bodyHtml.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error || "Campaign failed to send.", "error");
        return;
      }
      toast(`Campaign sent to ${json.sent} subscriber(s).`, "success");
      setSubject("");
      setBodyHtml("");
    } catch {
      toast("Could not reach the campaign service.", "error");
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async (subscriber: Subscriber) => {
    const res = await fetch(NEWSLETTER_ENDPOINT, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: subscriber.id }),
    });
    if (!res.ok) {
      toast("Could not remove subscriber.", "error");
      return;
    }
    toast("Subscriber removed.", "success");
    await loadNewsletter();
  };

  const activeSubscribers = subscribers.filter((s) => s.isActive);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-sand-light p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/10 text-gold flex items-center justify-center rounded-full">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-soft-black">{stats.count}</p>
              <p className="text-xs text-earth uppercase tracking-wider">Total Subscribers</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-sand-light p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-full">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-soft-black">{stats.activeCount}</p>
              <p className="text-xs text-earth uppercase tracking-wider">Active (Opted In)</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-sand-light p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 text-gray-500 flex items-center justify-center rounded-full">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-soft-black">{stats.count - stats.activeCount}</p>
              <p className="text-xs text-earth uppercase tracking-wider">Unsubscribed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Campaign composer */}
        <section className="lg:col-span-3 bg-white border border-sand-light p-6">
          <h2 className="text-lg font-semibold text-soft-black flex items-center gap-2 mb-4">
            <Send className="w-4 h-4 text-gold" />
            Send a Campaign
          </h2>
          <div className="space-y-4">
            <FormInput
              label="Subject Line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. The Kivara Edit — Autumn in the Luangwa"
            />
            <FormTextarea
              label="Message Body (HTML allowed)"
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={10}
              placeholder="<p>Write your newsletter content here. Simple HTML like <strong>, <em>, and <a> links are supported.</p>"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-earth">
                Will be sent to <span className="font-medium text-soft-black">{stats.activeCount}</span> active subscriber(s) via Brevo.
              </p>
              <button
                onClick={handleSend}
                disabled={sending || stats.activeCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-soft-black hover:bg-earth disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Sending…" : "Send Campaign"}
              </button>
            </div>
          </div>
        </section>

        {/* Subscriber list */}
        <section className="lg:col-span-2 bg-white border border-sand-light p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-soft-black flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-gold" />
            Subscribers
          </h2>

          {loading ? (
            <div className="space-y-3">
              <SkeletonText lines={6} />
            </div>
          ) : subscribers.length === 0 ? (
            <EmptyState title="No subscribers yet" description="Signups from the site newsletter form will appear here." />
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1 max-h-[480px] pr-1">
              {activeSubscribers.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 border border-sand-light bg-warm-white/50 rounded"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-soft-black truncate">{s.email}</p>
                    <p className="text-[11px] text-earth">
                      Subscribed {new Date(s.subscribedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                    <button
                      onClick={() => handleRemove(s)}
                      title="Remove subscriber"
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {subscribers.filter((s) => !s.isActive).length > 0 && (
                <div className="pt-2 border-t border-sand-light">
                  <p className="text-[11px] text-earth uppercase tracking-wider mb-2">
                    Unsubscribed ({subscribers.filter((s) => !s.isActive).length})
                  </p>
                  {subscribers.filter((s) => !s.isActive).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 opacity-60">
                      <div className="min-w-0">
                        <p className="text-sm text-soft-black truncate line-through">{s.email}</p>
                        <p className="text-[11px] text-earth">
                          Unsubscribed {s.unsubscribedAt ? new Date(s.unsubscribedAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <XCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
