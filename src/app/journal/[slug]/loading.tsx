export default function JournalLoading() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="h-6 w-24 bg-warm-white-dark animate-pulse mb-8" />
        <div className="h-10 w-full bg-warm-white-dark animate-pulse mb-4" />
        <div className="h-10 w-3/4 bg-warm-white-dark animate-pulse mb-8" />
        <div className="space-y-3">
          <div className="h-4 bg-warm-white-dark animate-pulse w-full" />
          <div className="h-4 bg-warm-white-dark animate-pulse w-full" />
          <div className="h-4 bg-warm-white-dark animate-pulse w-3/4" />
        </div>
      </div>
    </div>
  );
}
