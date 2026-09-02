"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, Users, DollarSign } from "lucide-react";

interface GuestBooking {
  id: string;
  ref: string;
  destination: string;
  startDate: string;
  endDate: string;
  guests: number;
  totalAmount: number;
  balanceAmount: number;
  currency: string;
  status: string;
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  provisional: { label: "Provisional", color: "text-gray-600", bg: "bg-gray-100" },
  deposit_paid: { label: "Deposit Paid", color: "text-sky-700", bg: "bg-sky-50" },
  confirmed: { label: "Confirmed", color: "text-emerald-700", bg: "bg-emerald-50" },
  balance_due: { label: "Balance Due", color: "text-amber-700", bg: "bg-amber-50" },
  paid: { label: "Paid in Full", color: "text-teal-700", bg: "bg-teal-50" },
  in_progress: { label: "In Progress", color: "text-indigo-700", bg: "bg-indigo-50" },
  completed: { label: "Completed", color: "text-blue-700", bg: "bg-blue-50" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50" },
};

export default function PortalDashboardPage() {
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/guest/bookings")
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        return r.json();
      })
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setBookings(json.bookings || []);
      })
      .catch((err) => {
        if (err.message === "Not authenticated") {
          router.push("/portal/login");
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[#8B7D6B]">Loading your journeys...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl text-[#1A1A1A] mb-2">
        Your Journeys
      </h1>
      <p className="text-sm text-[#8B7D6B] mb-8">View your bookings, itineraries, and payment status.</p>

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#EDE5DA]">
          <p className="text-sm text-[#8B7D6B] mb-2">No bookings found yet.</p>
          <p className="text-xs text-[#8B7D6B]">
            Once you&apos;ve booked a journey with Kivara, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const s = STATUS_STYLES[b.status] || { label: b.status, color: "text-gray-600", bg: "bg-gray-100" };
            return (
              <Link
                key={b.id}
                href={`/portal/booking/${b.id}`}
                className="block bg-white border border-[#EDE5DA] p-6 hover:border-[#C9A96E] transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-[#8B7D6B] font-mono mb-1">{b.ref}</p>
                    <h3 className="font-heading text-lg text-[#1A1A1A]">
                      {b.destination || "Luxury Journey"}
                    </h3>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs rounded ${s.bg} ${s.color}`}>
                    {s.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-[#8B7D6B]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {b.startDate || "TBD"} – {b.endDate || "TBD"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {b.guests} guest{b.guests !== 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    {b.currency} {b.totalAmount?.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Balance: {b.currency} {b.balanceAmount?.toLocaleString() || "0"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
