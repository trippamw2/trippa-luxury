"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, Send, FileText } from "lucide-react";
import { EmptyState } from "@/app/admin/components/EmptyState";

/**
 * camelCase shape returned by GET /api/admin/proposals/[id], which joins the
 * lead and journey so their names arrive alongside the row.
 */
interface ProposalDetail {
  id: string;
  proposalReference?: string;
  title?: string;
  slug?: string;
  status?: string;
  journeySummary?: unknown;
  itineraryDescription?: unknown;
  inclusions?: unknown;
  exclusions?: unknown;
  importantNotes?: unknown;
  termsAndConditions?: unknown;
  paymentTerms?: unknown;
  cancellationTerms?: unknown;
  totalInvestment?: number | null;
  depositAmount?: number | null;
  balanceAmount?: number | null;
  currency?: string;
  sentDate?: string | null;
  viewedDate?: string | null;
  acceptedDate?: string | null;
  expiryDate?: string | null;
  sentToEmail?: string | null;
  supplierCost?: number | null;
  grossProfit?: number | null;
  grossMargin?: number | null;
  commission?: number | null;
  createdAt?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  journeyName?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-50 text-gray-700",
  ready: "bg-blue-50 text-blue-700",
  sent: "bg-purple-50 text-purple-700",
  viewed: "bg-indigo-50 text-indigo-700",
  accepted: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
  expired: "bg-amber-50 text-amber-700",
};

/** JSONB content is stored as either a string or a list of strings/objects. */
function labelFor(entry: unknown): string {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object") {
    const record = entry as Record<string, unknown>;
    for (const key of ["name", "title", "label", "description", "item"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    return JSON.stringify(entry);
  }
  return String(entry);
}

function renderContent(value: unknown) {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <ul className="space-y-1.5">
        {value.map((entry, index) => (
          <li key={index} className="flex gap-2 text-sm text-gray-700">
            <span className="text-gold" aria-hidden="true">
              •
            </span>
            <span>{labelFor(entry)}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    const text = labelFor(value);
    if (!text.trim()) return null;
    return <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>;
  }

  const text = String(value).trim();
  if (!text) return null;
  return <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>;
}

/** Renders nothing at all when the field is empty, rather than an empty box. */
function Section({ title, value }: { title: string; value: unknown }) {
  const content = renderContent(value);
  if (!content) return null;
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">{title}</h3>
      {content}
    </div>
  );
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function formatMoney(value: number | null | undefined, currency?: string): string | null {
  if (value === null || value === undefined) return null;
  return `${currency || "USD"} ${value.toLocaleString()}`;
}

function DetailCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value ?? "—"}</p>
    </div>
  );
}

export default function AdminProposalDetail() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    bookingReference: string | null;
    error: string | null;
  } | null>(null);

  // The request is awaited before any state update, so nothing is set
  // synchronously inside the effect body; a later refresh re-runs the same
  // loader rather than mutating the record in place.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/proposals/${id}`);
        const json = await res.json();
        if (!active) return;
        if (json.error) {
          setError(json.error);
        } else {
          setProposal(json as ProposalDetail);
        }
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load proposal");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const handleSend = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`/api/admin/proposals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send proposal");
      setSendResult({
        bookingReference: json.bookingReference || null,
        error: json.pipelineError || null,
      });
      const refreshed = await fetch(`/api/admin/proposals/${id}`).then((r) => r.json());
      if (!refreshed.error) setProposal(refreshed as ProposalDetail);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to send proposal");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-400">Loading proposal...</div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <EmptyState
        icon={FileText}
        title={error === "Not found" ? "Proposal not found" : "Could not load proposal"}
        description={error === "Not found" ? undefined : error || "Unknown error"}
        action={{ label: "Back to proposals", href: "/admin/proposals" }}
      />
    );
  }

  const status = proposal.status || "draft";
  const money = (value: number | null | undefined) =>
    formatMoney(value, proposal.currency) ?? "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.push("/admin/proposals")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gold transition-colors mb-3 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to proposals
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              {proposal.title || "Untitled proposal"}
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${
                STATUS_COLORS[status] || "bg-gray-50 text-gray-600"
              }`}
            >
              {status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1 font-mono">
            {proposal.proposalReference || "—"}
          </p>
        </div>

        {status === "ready" && (
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-soft-black text-cream text-sm font-medium rounded-lg hover:bg-soft-black/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {sending ? "Sending..." : "Send proposal"}
          </button>
        )}
      </div>

      {sendResult && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm border ${
            sendResult.error
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-green-50 border-green-200 text-green-800"
          }`}
        >
          {sendResult.error
            ? `Proposal sent but the booking registration reported an issue: ${sendResult.error}`
            : sendResult.bookingReference
              ? `Proposal sent. Provisional booking ${sendResult.bookingReference} has been registered.`
              : "Proposal sent."}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <DetailCard label="Customer" value={proposal.customerName || "—"} />
        <DetailCard label="Journey" value={proposal.journeyName || "—"} />
        <DetailCard label="Total investment" value={money(proposal.totalInvestment)} />
        <DetailCard label="Currency" value={proposal.currency || "USD"} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <DetailCard label="Deposit" value={money(proposal.depositAmount)} />
        <DetailCard label="Balance" value={money(proposal.balanceAmount)} />
        <DetailCard label="Sent" value={formatDate(proposal.sentDate) || "—"} />
        <DetailCard label="Expiry" value={formatDate(proposal.expiryDate) || "—"} />
      </div>

      {(proposal.customerEmail || proposal.customerPhone || proposal.sentToEmail) && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
            Contact
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
            <p>{proposal.customerEmail || "—"}</p>
            <p>{proposal.customerPhone || "—"}</p>
            <p>{proposal.sentToEmail || "—"}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-4">
          Proposal content
        </h3>
        <div className="space-y-5">
          <Section title="Journey summary" value={proposal.journeySummary} />
          <Section title="Itinerary" value={proposal.itineraryDescription} />
          <Section title="What's included" value={proposal.inclusions} />
          <Section title="What's excluded" value={proposal.exclusions} />
          <Section title="Important notes" value={proposal.importantNotes} />
          <Section title="Payment terms" value={proposal.paymentTerms} />
          <Section title="Cancellation terms" value={proposal.cancellationTerms} />
          <Section title="Terms & conditions" value={proposal.termsAndConditions} />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">Internal</h3>
          <span className="text-[10px] text-gray-400">not shown to the customer</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <DetailCard label="Supplier cost" value={money(proposal.supplierCost)} />
          <DetailCard label="Gross profit" value={money(proposal.grossProfit)} />
          <DetailCard label="Gross margin" value={money(proposal.grossMargin)} />
          <DetailCard label="Commission" value={money(proposal.commission)} />
        </div>
        {(formatDate(proposal.viewedDate) || formatDate(proposal.acceptedDate)) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <DetailCard label="Viewed" value={formatDate(proposal.viewedDate) || "—"} />
            <DetailCard label="Accepted" value={formatDate(proposal.acceptedDate) || "—"} />
            <DetailCard
              label="Created"
              value={
                proposal.createdAt ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    {formatDate(proposal.createdAt)}
                  </span>
                ) : (
                  "—"
                )
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
