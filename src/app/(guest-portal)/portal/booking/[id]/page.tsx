"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Calendar, MapPin, Users, ArrowLeft, CreditCard, Banknote } from "lucide-react";

interface BookingDetail {
  id: string;
  ref: string;
  destination: string;
  startDate: string;
  endDate: string;
  guests: number;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  specialRequests?: string;
}

export default function PortalBookingDetailPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/guest/bookings/${bookingId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated or booking not found");
        return r.json();
      })
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setBooking(json.booking);
      })
      .catch((err) => {
        if (err.message.includes("Not authenticated")) {
          window.location.href = "/portal/login";
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[#8B7D6B]">Loading booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-600">{error || "Booking not found"}</p>
        <a href="/portal" className="text-xs text-[#C9A96E] hover:underline mt-2 inline-block">Back to Dashboard</a>
      </div>
    );
  }

  const formatDate = (d: string) => {
    if (!d) return "TBD";
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div>
      <a href="/portal" className="inline-flex items-center gap-1.5 text-xs text-[#8B7D6B] hover:text-[#C9A96E] transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </a>

      {/* Header */}
      <div className="bg-white border border-[#EDE5DA] p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-[#8B7D6B] font-mono mb-1">{booking.ref}</p>
            <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "24px", color: "#1A1A1A" }}>
              {booking.destination || "Luxury Journey"}
            </h1>
          </div>
          <span className={`inline-flex px-3 py-1.5 text-xs rounded ${
            booking.status === "confirmed" || booking.status === "paid" ? "bg-emerald-50 text-emerald-700" :
            booking.status === "balance_due" ? "bg-amber-50 text-amber-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {booking.status?.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-[#8B7D6B]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <div>
              <p className="text-[10px] uppercase tracking-[1px]">Dates</p>
              <p className="text-[#1A1A1A]">{formatDate(booking.startDate)} – {formatDate(booking.endDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <div>
              <p className="text-[10px] uppercase tracking-[1px]">Guests</p>
              <p className="text-[#1A1A1A]">{booking.guests}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <div>
              <p className="text-[10px] uppercase tracking-[1px]">Destination</p>
              <p className="text-[#1A1A1A]">{booking.destination || "TBD"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="bg-white border border-[#EDE5DA] p-6 mb-6">
        <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "18px", color: "#1A1A1A" }} className="mb-4">
          Payment Status
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 bg-[#FAF7F2]">
            <p className="text-[10px] text-[#8B7D6B] uppercase tracking-[1px] mb-1">Total Investment</p>
            <p className="text-xl font-bold text-[#1A1A1A]">{booking.currency} {booking.totalAmount?.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-[#FAF7F2]">
            <p className="text-[10px] text-[#8B7D6B] uppercase tracking-[1px] mb-1">Deposit Paid</p>
            <p className="text-xl font-bold text-emerald-700">{booking.currency} {booking.depositAmount?.toLocaleString() || "0"}</p>
          </div>
          <div className="text-center p-4 bg-[#FAF7F2]">
            <p className="text-[10px] text-[#8B7D6B] uppercase tracking-[1px] mb-1">Balance Due</p>
            <p className={`text-xl font-bold ${booking.balanceAmount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              {booking.currency} {booking.balanceAmount?.toLocaleString() || "0"}
            </p>
          </div>
        </div>

        {booking.balanceAmount > 0 && (
          <div className="p-4 bg-[#F5F0EB] border-l-3 border-[#C9A96E]">
            <p className="text-xs text-[#8B7D6B] mb-3">
              Your balance payment is due within 30 days of your departure date. Choose your preferred payment method below.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`/payment/${booking.id}?type=balance&method=paypal`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-[#FAF7F2] text-[11px] uppercase tracking-[2px] hover:bg-[#2A2A2A] transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                Pay Balance via PayPal
              </a>
              <a
                href={`/payment/${booking.id}?type=balance&method=wire_transfer`}
                className="inline-flex items-center gap-2 px-6 py-3 border border-[#1A1A1A] text-[#1A1A1A] text-[11px] uppercase tracking-[2px] hover:bg-[#1A1A1A] hover:text-[#FAF7F2] transition-colors"
              >
                <Banknote className="w-4 h-4" />
                Pay via Wire Transfer
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Special Requests */}
      {booking.specialRequests && (
        <div className="bg-white border border-[#EDE5DA] p-6">
          <h2 style={{ fontFamily: "'Times New Roman', serif", fontSize: "18px", color: "#1A1A1A" }} className="mb-3">
            Special Requests
          </h2>
          <p className="text-sm text-[#4A4A4A] leading-relaxed">{booking.specialRequests}</p>
        </div>
      )}
    </div>
  );
}
