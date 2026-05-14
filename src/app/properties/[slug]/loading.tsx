export default function PropertyLoading() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Hero skeleton */}
      <div className="h-[60vh] bg-warm-white-dark animate-pulse" />
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="h-8 w-48 bg-warm-white-dark animate-pulse mb-4" />
        <div className="h-4 w-96 bg-warm-white-dark animate-pulse mb-8" />
        <div className="space-y-3">
          <div className="h-4 bg-warm-white-dark animate-pulse w-full" />
          <div className="h-4 bg-warm-white-dark animate-pulse w-3/4" />
          <div className="h-4 bg-warm-white-dark animate-pulse w-5/6" />
        </div>
      </div>
    </div>
  );
}
