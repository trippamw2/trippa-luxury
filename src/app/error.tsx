"use client";

export default function RootError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center max-w-md mx-auto px-6">
        <h2 className="text-3xl font-heading font-medium text-soft-black mb-4">
          Something went wrong
        </h2>
        <p className="text-earth mb-8 leading-relaxed">
          We apologize for the inconvenience. Please try refreshing the page.
        </p>
        <button
          onClick={reset}
          className="px-8 py-3 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
