"use client";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F7F3EF] text-[#1A1A1A]">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <h2 className="text-3xl font-heading font-medium text-[#1A1A1A] mb-4">
              Something went wrong
            </h2>
            <p className="text-[#4A4A4A] mb-8 leading-relaxed">
              We apologize for the inconvenience. Please try refreshing the page.
            </p>
            {error.digest ? (
              <p className="text-xs text-[#8B7D6B] mb-8 font-mono">
                Reference: {error.digest}
              </p>
            ) : null}
            <button
              onClick={retry}
              className="px-8 py-3 bg-[#1A1A1A] text-[#F7F3EF] text-sm tracking-widest uppercase hover:bg-[#333333] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
