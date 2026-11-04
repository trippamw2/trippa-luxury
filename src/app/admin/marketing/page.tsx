"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  Send,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  UserRound,
  Sparkles,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/app/admin/components/Toast";
import { SkeletonText } from "@/app/admin/components/Skeleton";
import { EmptyState } from "@/app/admin/components/EmptyState";
import { FormInput, FormSelect, FormTextarea } from "@/app/admin/components/FormField";

type AudienceSource = "newsletter" | "guests";

interface AudiencePreview {
  matched: number;
  recipients: number;
  suppressed: number;
}

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

  // Segmentation. The API already supports it; the composer used to always
  // send to the whole newsletter list.
  const [audienceSource, setAudienceSource] = useState<AudienceSource>("newsletter");
  const [vipOnly, setVipOnly] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const tags = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const audience = {
    source: audienceSource,
    tags,
    vipOnly: audienceSource === "guests" ? vipOnly : false,
  };

  /** Any audience change invalidates a previous preview count. */
  const changeAudience = (fn: () => void) => {
    fn();
    setPreview(null);
  };

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

  const handlePreview = async () => {
    if (previewing || sending) return;
    setPreviewing(true);
    try {
      const res = await fetch(NEWSLETTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Preview only resolves the audience; the API still validates these
          // two fields, so send harmless placeholders when they are blank.
          subject: subject.trim() || "Audience preview",
          bodyHtml: bodyHtml.trim() || "<p>Audience preview</p>",
          audience,
          preview: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPreview(null);
        toast(json.error || "Could not resolve this audience.", "error");
        return;
      }
      setPreview({
        matched: json.matched ?? 0,
        recipients: json.recipients ?? 0,
        suppressed: json.suppressed ?? 0,
      });
    } catch {
      toast("Could not reach the campaign service.", "error");
    } finally {
      setPreviewing(false);
    }
  };

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
        body: JSON.stringify({
          subject: subject.trim(),
          bodyHtml: bodyHtml.trim(),
          audience,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast(json.error || "Campaign failed to send.", "error");
        return;
      }
      toast(
        json.suppressed
          ? `Campaign sent to ${json.sent} recipient(s); ${json.suppressed} on the do-not-email list were skipped.`
          : `Campaign sent to ${json.sent} recipient(s).`,
        "success"
      );
      setSubject("");
      setBodyHtml("");
      setPreview(null);
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

            {/* Audience / segmentation */}
            <div className="border border-sand-light bg-warm-white/40 p-4 space-y-3">
              <p className="text-xs font-medium text-soft-black uppercase tracking-wider">
                Audience
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormSelect
                  label="Send to"
                  name="audienceSource"
                  value={audienceSource}
                  onChange={(e) => {
                    const source = e.target.value as AudienceSource;
                    changeAudience(() => setAudienceSource(source));
                  }}
                  options={[
                    { value: "newsletter", label: "Newsletter subscribers" },
                    { value: "guests", label: "Guests (opted in)" },
                  ]}
                />
                {audienceSource === "guests" ? (
                  <FormInput
                    label="Tags (comma separated)"
                    name="audienceTags"
                    value={tagsInput}
                    onChange={(e) => changeAudience(() => setTagsInput(e.target.value))}
                    placeholder="e.g. honeymoon, safari"
                  />
                ) : (
                  <div className="flex items-end">
                    <p className="text-xs text-earth pb-3">
                      Everyone who signed up on the site and has not unsubscribed.
                    </p>
                  </div>
                )}
              </div>

              {audienceSource === "guests" && (
                <label className="flex items-center gap-2 text-sm text-earth cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={vipOnly}
                    onChange={(e) => changeAudience(() => setVipOnly(e.target.checked))}
                    className="accent-gold"
                  />
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  VIP guests only
                </label>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => void handlePreview()}
                  disabled={previewing || sending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-sand-light bg-white text-earth hover:border-gold disabled:opacity-50 transition-colors"
                >
                  {previewing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  Preview audience
                </button>
                {preview && (
                  <p className="text-xs text-earth">
                    <span className="font-medium text-soft-black">{preview.recipients}</span>{" "}
                    will receive this
                    {preview.suppressed > 0 && (
                      <>
                        {" "}
                        · {preview.suppressed} on the do-not-email list skipped
                      </>
                    )}
                    {preview.matched !== preview.recipients + preview.suppressed && (
                      <> · {preview.matched} matched before de-duplication</>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-earth">
                {audienceSource === "newsletter" ? (
                  <>
                    Will be sent to{" "}
                    <span className="font-medium text-soft-black">{stats.activeCount}</span> active
                    subscriber(s) via Brevo.
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="w-3.5 h-3.5" />
                    Guests who opted in
                    {vipOnly ? ", VIP only" : ""}
                    {tags.length > 0 ? `, tagged ${tags.join(", ")}` : ""}.
                  </span>
                )}
              </p>
              <button
                onClick={handleSend}
                disabled={sending || (audienceSource === "newsletter" && stats.activeCount === 0)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-soft-black hover:bg-earth disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Sending…" : "Send Campaign"}
              </button>
            </div>
            {preview && preview.recipients === 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  No one matches this audience. Widen the tags, turn off VIP-only, or send to the
                  newsletter list instead.
                </span>
              </div>
            )}
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
