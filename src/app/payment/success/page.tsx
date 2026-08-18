"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const ref = searchParams.get("ref");

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="bg-white border border-[#EDE5DA] p-8">
          <div className="w-16 h-16 bg-[#D4BC8A] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-[#1A1A1A]" />
          </div>
          <h1 style={{ fontFamily: "'Times New Roman', serif", fontSize: "24px", color: "#1A1A1A" }} className="mb-2">
            Payment Confirmed
          </h1>
          <p className="text-sm text-[#8B7D6B] mb-6">
            Thank you for your payment. Your booking has been updated and a receipt has been sent to your email.
          </p>
          {ref && (
            <div className="p-4 bg-[#F5F0EB] mb-6">
              <p className="text-[10px] text-[#8B7D6B] uppercase tracking-[1px] mb-1">Booking Reference</p>
              <p style={{ fontFamily: "'Times New Roman', serif", fontSize: "18px", color: "#1A1A1A" }}>{ref}</p>
            </div>
          )}
          <div className="space-y-3">
            {bookingId && (
              <a
                href={`/portal/booking/${bookingId}`}
                className="block w-full px-4 py-3 bg-[#1A1A1A] text-[#FAF7F2] text-[11px] uppercase tracking-[2px] hover:bg-[#2A2A2A] transition-colors"
              >
                View Booking
              </a>
            )}
            <a
              href="/portal"
              className="block w-full px-4 py-3 border border-[#EDE5DA] text-[#8B7D6B] text-[11px] uppercase tracking-[2px] hover:bg-[#F5F0EB] transition-colors"
            >
              Back to Portal
            </a>
          </div>
        </div>
        <p className="text-[11px] text-[#8B7D6B] mt-6">
          Questions? Contact <a href="mailto:concierge@kivara.luxury" className="text-[#C9A96E] hover:underline">concierge@kivara.luxury</a>
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <p className="text-sm text-[#8B7D6B]">Loading...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
