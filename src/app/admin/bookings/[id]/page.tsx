"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/app/admin/components/Toast";

interface Booking {
  id: string;
  booking_reference?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  destination?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  guests?: number | null;
  total_amount?: number | null;
  deposit_amount?: number | null;
  balance_amount?: number | null;
  currency?: string | null;
  status?: string | null;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  reference?: string | null;
  payment_method?: string | null;
  payment_type?: string | null;
  notes?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
}

interface RefundInfo {
  bookingId: string;
  currency: string;
  status: string;
  totalAmount: number | null;
  balanceAmount: number | null;
  refundable: number;
  payments: Payment[];
}

export default function BookingDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [refundInfo, setRefundInfo] = useState<RefundInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [bRes, rRes] = await Promise.all([
        fetch(`/api/admin/bookings/${id}`),
        fetch(`/api/admin/bookings/${id}/refund`),
      ]);
      if (!bRes.ok) throw new Error("Failed to load booking");
      const bJson = await bRes.json();
      setBooking(bJson);
      if (rRes.ok) {
        const rJson = await rRes.json();
        setRefundInfo(rJson);
        setRefundAmount(String(rJson.refundable ?? 0));
      } else {
        setRefundInfo(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load booking");
    } finally {
      setLoading(false);
    }
  }

useEffect(() => {
    if (!id) return;
    const timer = setTimeout(() => {
      void load();
      fetch("/api/admin/auth/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => setRole(j?.role ?? null))
        .catch(() => setRole(null));
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isAdmin = role === "admin";
  const refundable = refundInfo?.refundable ?? 0;

  async function submitRefund() {
    if (!refundReason.trim()) {
      toast("Reason is required", "error");
      return;
    }
    const payload: Record<string, unknown> = { type: refundType, reason: refundReason.trim() };
    if (refundType === "partial") {
      const amt = Number(refundAmount);
      if (!Number.isFinite(amt) || amt <= 0) {
        toast("Enter a valid amount", "error");
        return;
      }
      payload.amount = amt;
    }
    setRefundSubmitting(true);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Refund failed");
      toast("Refund processed", "success");
      setRefundOpen(false);
      setRefundReason("");
      await load();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Refund failed", "error");
    } finally {
      setRefundSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-8">
        <Link href="/admin/bookings" className="text-sm text-gold underline">
          Back to bookings
        </Link>
        <p className="mt-4 text-red-600">{error || "Booking not found"}</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/bookings" className="inline-flex items-center gap-2 text-sm text-earth hover:text-soft-black">
          <ArrowLeft className="w-4 h-4" /> Back to bookings
        </Link>
        <button onClick={load} className="inline-flex items-center gap-2 text-sm text-earth hover:text-soft-black">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white border border-sand-light/50 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-heading text-soft-black mb-1">
          {booking.booking_reference || booking.id.slice(0, 8).toUpperCase()}
        </h1>
        <p className="text-sm text-earth mb-4">{booking.client_name} · {booking.client_email}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-earth block text-xs uppercase tracking-wider">Status</span>{booking.status}</div>
          <div><span className="text-earth block text-xs uppercase tracking-wider">Destination</span>{booking.destination || "—"}</div>
          <div><span className="text-earth block text-xs uppercase tracking-wider">Check-in</span>{booking.check_in || "—"}</div>
          <div><span className="text-earth block text-xs uppercase tracking-wider">Check-out</span>{booking.check_out || "—"}</div>
          <div><span className="text-earth block text-xs uppercase tracking-wider">Guests</span>{booking.guests ?? "—"}</div>
          <div><span className="text-earth block text-xs uppercase tracking-wider">Total</span>{booking.currency} {Number(booking.total_amount || 0).toLocaleString()}</div>
          <div><span className="text-earth block text-xs uppercase tracking-wider">Deposit</span>{booking.currency} {Number(booking.deposit_amount || 0).toLocaleString()}</div>
          <div><span className="text-earth block text-xs uppercase tracking-wider">Balance</span>{booking.currency} {Number(booking.balance_amount || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white border border-sand-light/50 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading text-soft-black">Payments</h2>
          {isAdmin && (
            <button
              onClick={() => {
                setRefundType("full");
                setRefundAmount(String(refundable));
                setRefundReason("");
                setRefundOpen(true);
              }}
              disabled={refundable <= 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-colors disabled:opacity-40"
            >
              <CreditCard className="w-4 h-4" /> Refund
            </button>
          )}
        </div>
        <p className="text-xs text-earth mb-4">Refundable: {refundInfo?.currency || booking.currency} {refundable.toLocaleString()}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-earth border-b border-sand-light/50">
                <th className="py-2">Date</th>
                <th className="py-2">Method</th>
                <th className="py-2">Type</th>
                <th className="py-2">Status</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Reference</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(refundInfo?.payments || []).map((p) => (
                <tr key={p.id} className="border-b border-sand-light/30">
                  <td className="py-2">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                  <td className="py-2">{p.payment_method}</td>
                  <td className="py-2">{p.payment_type}</td>
                  <td className="py-2">{p.status}</td>
                  <td className="py-2">{p.currency} {Number(p.amount).toLocaleString()}</td>
                  <td className="py-2 font-mono text-xs">{p.reference || "—"}</td>
                  <td className="py-2 text-earth">{p.notes || "—"}</td>
                </tr>
              ))}
              {(refundInfo?.payments || []).length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-earth">No payments recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {refundOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !refundSubmitting && setRefundOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-heading text-soft-black mb-4">Refund</h3>
            <p className="text-sm text-earth mb-4">Refundable: {refundInfo?.currency || booking.currency} {refundable.toLocaleString()}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-earth block mb-2">Type</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" checked={refundType === "full"} onChange={() => { setRefundType("full"); setRefundAmount(String(refundable)); }} /> Full
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" checked={refundType === "partial"} onChange={() => setRefundType("partial")} /> Partial
                  </label>
                </div>
              </div>
              {refundType === "partial" && (
                <div>
                  <label className="text-xs uppercase tracking-wider text-earth block mb-2">Amount</label>
                  <input
                    type="number"
                    min="0"
                    max={refundable}
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full border border-sand-light/50 rounded px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="text-xs uppercase tracking-wider text-earth block mb-2">Reason (required)</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  className="w-full border border-sand-light/50 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => !refundSubmitting && setRefundOpen(false)}
                  className="px-4 py-2 text-sm text-earth hover:text-soft-black"
                  disabled={refundSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={submitRefund}
                  disabled={refundSubmitting}
                  className="px-4 py-2 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-colors disabled:opacity-40"
                >
                  {refundSubmitting ? "Processing..." : "Process refund"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}