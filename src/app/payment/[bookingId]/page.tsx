"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { CreditCard, Building2, CheckCircle, ArrowLeft, ExternalLink } from "lucide-react";

type PaymentMethod = "paypal" | "wire_transfer";

interface BookingInfo {
  id: string;
  bookingReference: string;
  clientName: string;
  clientEmail: string;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  currency: string;
  status: string;
}

interface WireTransferDetails {
  reference: string;
  amount: number;
  currency: string;
  deadline: string;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    iban: string;
    swiftCode: string;
    routingNumber?: string;
    sortCode?: string;
    country?: string;
  };
  instructions: string;
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;

  const type = (searchParams.get("type") as "deposit" | "balance" | "full") || "balance";

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [wireDetails, setWireDetails] = useState<WireTransferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await fetch(`/api/guest/bookings/${bookingId}`);
      if (!res.ok) throw new Error("Booking not found");
      const data = await res.json();
      setBooking(data.booking || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load booking");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    Promise.resolve().then(fetchBooking);
  }, [fetchBooking]);

  const handlePayPal = async () => {
    if (!booking) return;
    setProcessing(true);
    setError(null);
    try {
      const total = type === "deposit"
        ? booking.depositAmount || Math.round(booking.totalAmount * 0.3)
        : type === "balance"
          ? booking.balanceAmount
          : booking.totalAmount;

      const res = await fetch("/api/payment/paypal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: total,
          currency: booking.currency,
          type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create PayPal payment");
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setProcessing(false);
    }
  };

  const handleWireTransfer = async () => {
    if (!booking) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch("/api/payment/wire-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate wire transfer details");
      setWireDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wire transfer details");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <p className="text-sm text-[#8B7D6B]">Loading payment details...</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <a href="/portal" className="text-sm text-[#C9A96E] hover:underline">Back to Portal</a>
        </div>
      </div>
    );
  }

  // Show wire transfer details after selection
  if (wireDetails) {
    const b = wireDetails.bankDetails;
    return (
      <div className="min-h-screen bg-[#FAF7F2] py-12 px-6">
        <div className="max-w-lg mx-auto">
          <button onClick={() => setWireDetails(null)} className="flex items-center gap-1 text-sm text-[#8B7D6B] hover:text-[#1A1A1A] mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to payment options
          </button>

          <div className="bg-white border border-[#EDE5DA] p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-[#D4BC8A] rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-7 h-7 text-[#1A1A1A]" />
              </div>
              <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "22px", color: "#1A1A1A" }} className="mb-2">
                Wire Transfer Instructions
              </h1>
              <p className="text-sm text-[#8B7D6B]">Please transfer the exact amount using the details below.</p>
            </div>

            {/* Amount & Reference */}
            <div className="bg-[#F5F0EB] p-5 mb-6 text-center">
              <p className="text-[10px] text-[#8B7D6B] uppercase tracking-[1px] mb-1">Amount Due</p>
              <p style={{ fontFamily: "'Times New Roman', serif", fontSize: "28px", fontWeight: 700, color: "#C9A96E" }}>
                {wireDetails.currency} {wireDetails.amount.toLocaleString()}
              </p>
              <p className="text-xs text-[#8B7D6B] mt-2">
                Payment Reference: <span className="font-semibold text-[#1A1A1A] tracking-wider">{wireDetails.reference}</span>
              </p>
            </div>

            {/* Bank Details */}
            <div className="space-y-3 mb-6">
              <DetailRow label="Bank Name" value={b.bankName} />
              <DetailRow label="Account Name" value={b.accountName} />
              <DetailRow label="Account Number" value={b.accountNumber} />
              {b.iban && <DetailRow label="IBAN" value={b.iban} />}
              {b.swiftCode && <DetailRow label="SWIFT / BIC" value={b.swiftCode} highlight />}
              {b.routingNumber && <DetailRow label="Routing Number" value={b.routingNumber} />}
              {b.sortCode && <DetailRow label="Sort Code" value={b.sortCode} />}
              {b.country && <DetailRow label="Country" value={b.country} />}
            </div>

            {/* Instructions */}
            <div className="bg-[#F5F0EB] p-4 mb-6">
              <p className="text-[10px] text-[#8B7D6B] uppercase tracking-[1px] mb-2">Important</p>
              <ul className="text-xs text-[#4A4A4A] space-y-1.5 list-disc list-inside">
                <li>Include payment reference <strong>{wireDetails.reference}</strong> in the transfer description</li>
                <li>Wire transfers typically take 2-5 business days</li>
                <li>Complete payment by <strong>{wireDetails.deadline}</strong></li>
              </ul>
            </div>

            {booking && (
              <div className="text-center">
                <a href={`/portal/booking/${booking.id}`} className="inline-block px-6 py-3 bg-[#1A1A1A] text-[#FAF7F2] text-[11px] uppercase tracking-[2px] hover:bg-[#2A2A2A] transition-colors">
                  View Booking
                </a>
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#8B7D6B] mt-6 text-center">
            Questions? Contact <a href="mailto:concierge@kivara.luxury" className="text-[#C9A96E] hover:underline">concierge@kivara.luxury</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        {booking && (
          <div className="text-center mb-8">
            <p className="text-[10px] text-[#8B7D6B] uppercase tracking-[2px] mb-2">Booking Reference</p>
            <p style={{ fontFamily: "'Times New Roman', serif", fontSize: "18px", color: "#1A1A1A" }}>{booking.bookingReference}</p>
          </div>
        )}

        <div className="bg-white border border-[#EDE5DA] p-8">
          <div className="text-center mb-8">
            <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "22px", color: "#1A1A1A" }} className="mb-2">
              Complete Your Payment
            </h1>
            <p className="text-sm text-[#8B7D6B]">
              {type === "deposit" ? "Pay your deposit to secure this booking" : type === "balance" ? "Pay the remaining balance" : "Pay the full amount"}
            </p>
            {booking && (
              <p className="mt-3 text-lg font-semibold text-[#C9A96E]">
                {booking.currency} {(type === "deposit"
                  ? booking.depositAmount || Math.round(booking.totalAmount * 0.3)
                  : type === "balance"
                    ? booking.balanceAmount
                    : booking.totalAmount
                ).toLocaleString()}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 p-3 mb-6 text-sm text-red-700 text-center">{error}</div>
          )}

          <div className="space-y-4">
            {/* PayPal Option */}
            <button
              onClick={() => setSelectedMethod("paypal")}
              disabled={processing}
              className={`w-full p-5 border text-left transition-all hover:border-[#C9A96E] ${
                selectedMethod === "paypal" ? "border-[#C9A96E] bg-[#FAF7F2]" : "border-[#EDE5DA]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedMethod === "paypal" ? "bg-[#C9A96E]" : "bg-[#F5F0EB]"
                }`}>
                  <CreditCard className={`w-5 h-5 ${selectedMethod === "paypal" ? "text-white" : "text-[#8B7D6B]"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1A1A1A]">PayPal</p>
                  <p className="text-xs text-[#8B7D6B]">Instant online payment via secure PayPal checkout</p>
                </div>
                {selectedMethod === "paypal" && <CheckCircle className="w-5 h-5 text-[#C9A96E]" />}
              </div>
            </button>

            {/* Wire Transfer Option */}
            <button
              onClick={() => setSelectedMethod("wire_transfer")}
              disabled={processing}
              className={`w-full p-5 border text-left transition-all hover:border-[#C9A96E] ${
                selectedMethod === "wire_transfer" ? "border-[#C9A96E] bg-[#FAF7F2]" : "border-[#EDE5DA]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedMethod === "wire_transfer" ? "bg-[#C9A96E]" : "bg-[#F5F0EB]"
                }`}>
                  <Building2 className={`w-5 h-5 ${selectedMethod === "wire_transfer" ? "text-white" : "text-[#8B7D6B]"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Wire Transfer (SWIFT/IBAN)</p>
                  <p className="text-xs text-[#8B7D6B]">Bank transfer with full instructions provided. 2-5 business days.</p>
                </div>
                {selectedMethod === "wire_transfer" && <CheckCircle className="w-5 h-5 text-[#C9A96E]" />}
              </div>
            </button>
          </div>

          {/* Continue Button */}
          {selectedMethod && (
            <div className="mt-6">
              <button
                onClick={selectedMethod === "paypal" ? handlePayPal : handleWireTransfer}
                disabled={processing}
                className="w-full px-6 py-3.5 bg-[#1A1A1A] text-[#FAF7F2] text-[11px] uppercase tracking-[2px] hover:bg-[#2A2A2A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  "Processing..."
                ) : selectedMethod === "paypal" ? (
                  <>Continue to PayPal <ExternalLink className="w-3.5 h-3.5" /></>
                ) : (
                  "View Wire Transfer Details"
                )}
              </button>
            </div>
          )}
        </div>

        <p className="text-[11px] text-[#8B7D6B] mt-6 text-center">
          Questions? Contact <a href="mailto:concierge@kivara.luxury" className="text-[#C9A96E] hover:underline">concierge@kivara.luxury</a>
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#EDE5DA]">
      <span className="text-xs text-[#8B7D6B]">{label}</span>
      <span className={`text-sm ${highlight ? "font-semibold tracking-wider text-[#1A1A1A]" : "text-[#1A1A1A]"}`}>{value}</span>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <p className="text-sm text-[#8B7D6B]">Loading...</p>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
