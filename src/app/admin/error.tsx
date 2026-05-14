"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Dashboard Error
        </h2>
        <p className="text-gray-500 mb-6">
          Something went wrong loading this page.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-soft-black text-cream text-sm rounded hover:bg-soft-black-light transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
