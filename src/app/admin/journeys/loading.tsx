export default function JourneysLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-40 bg-soft-black/5 animate-pulse rounded" />
          <div className="h-4 w-56 bg-soft-black/5 animate-pulse rounded mt-1" />
        </div>
        <div className="h-4 w-24 bg-soft-black/5 animate-pulse rounded" />
      </div>
      <div className="flex gap-3 mb-6">
        <div className="flex-1 h-11 bg-soft-black/5 animate-pulse rounded" />
        <div className="w-44 h-11 bg-soft-black/5 animate-pulse rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 w-48 bg-soft-black/5 animate-pulse rounded mb-2" />
                <div className="h-3 w-36 bg-soft-black/5 animate-pulse rounded" />
              </div>
              <div className="text-right">
                <div className="h-4 w-20 bg-soft-black/5 animate-pulse rounded mb-1" />
                <div className="h-3 w-16 bg-soft-black/5 animate-pulse rounded" />
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              <div className="h-3 w-32 bg-soft-black/5 animate-pulse rounded" />
              <div className="h-3 w-24 bg-soft-black/5 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
