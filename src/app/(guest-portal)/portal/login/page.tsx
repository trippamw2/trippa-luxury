"use client";

import { useState } from "react";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/guest/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to send verification code");
        return;
      }
      setStep("otp");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/guest/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otp }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Invalid code. Please try again.");
        return;
      }
      window.location.href = "/portal";
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-[28px] text-[#1A1A1A] tracking-[4px]">
            KIVARA
          </h1>
          <p className="text-[10px] text-[#8B7D6B] uppercase tracking-[3px] mt-1">Guest Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#EDE5DA] p-8">
          {step === "email" ? (
            <>
              <h2 className="font-heading text-xl text-[#1A1A1A] mb-2">
                Welcome Back
              </h2>
              <p className="text-sm text-[#8B7D6B] mb-6">
                Enter your email address and we&apos;ll send you a verification code to access your bookings.
              </p>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] text-[#8B7D6B] uppercase tracking-[1px] mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-[#EDE5DA] text-sm focus:outline-none focus:border-[#C9A96E] bg-[#FAF7F2]"
                    placeholder="your@email.com"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-[#1A1A1A] text-[#FAF7F2] text-[11px] uppercase tracking-[2px] hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Verification Code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="font-heading text-xl text-[#1A1A1A] mb-2">
                Check Your Email
              </h2>
              <p className="text-sm text-[#8B7D6B] mb-6">
                We&apos;ve sent a 6-digit code to <strong className="text-[#1A1A1A]">{email}</strong>. Enter it below to access your portal.
              </p>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] text-[#8B7D6B] uppercase tracking-[1px] mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    className="w-full px-4 py-3 border border-[#EDE5DA] text-sm focus:outline-none focus:border-[#C9A96E] bg-[#FAF7F2] text-center text-lg tracking-[4px] font-mono"
                    placeholder="000000"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-[#1A1A1A] text-[#FAF7F2] text-[11px] uppercase tracking-[2px] hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Access Portal"}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep("email"); setError(""); }}
                  className="w-full text-center text-xs text-[#8B7D6B] hover:text-[#C9A96E] transition-colors"
                >
                  Use a different email
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-[#8B7D6B] mt-6">
          Need help? Contact us at{" "}
          <a href="mailto:concierge@kivara.luxury" className="text-[#C9A96E] hover:underline">concierge@kivara.luxury</a>
        </p>
      </div>
    </div>
  );
}
