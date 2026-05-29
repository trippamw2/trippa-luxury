"use client";

import { AlertTriangle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-ivory">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Decorative gold accent */}
        <div className="w-16 h-0.5 bg-gold mx-auto mb-8" />

        {/* Icon */}
        <div className="w-14 h-14 bg-soft-black/5 border border-gold/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-6 h-6 text-gold" />
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-heading font-semibold text-soft-black mb-3">
          Something went wrong
        </h2>

        {/* Description */}
        <p className="font-body text-sm text-earth leading-relaxed mb-8 max-w-xs mx-auto">
          We encountered an unexpected error loading this page.
          {process.env.NODE_ENV === "development" && error.digest && (
            <>
              <br />
              <span className="text-xs text-sand-dark mt-1 block">
                Digest: {error.digest}
              </span>
            </>
          )}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-gold text-soft-black text-sm font-medium tracking-wide hover:bg-gold-dark transition-colors"
          >
            Try Again
          </button>
          <a
            href="/admin"
            className="px-6 py-2.5 border border-sand-dark text-earth text-sm font-medium tracking-wide hover:bg-soft-black/5 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
