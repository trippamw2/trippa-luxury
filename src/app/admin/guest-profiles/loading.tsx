export default function GuestProfilesLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-48 bg-soft-black/5 animate-pulse rounded" />
          <div className="h-4 w-64 bg-soft-black/5 animate-pulse rounded mt-1" />
        </div>
        <div className="h-11 w-36 bg-soft-black/5 animate-pulse rounded" />
      </div>
      <div className="h-11 w-full bg-soft-black/5 animate-pulse rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 bg-soft-black/5 animate-pulse rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-soft-black/5 animate-pulse rounded mb-1" />
                <div className="h-3 w-40 bg-soft-black/5 animate-pulse rounded" />
              </div>
            </div>
            <div className="flex gap-1.5 mb-2">
              <div className="h-4 w-14 bg-soft-black/5 animate-pulse rounded" />
              <div className="h-4 w-20 bg-soft-black/5 animate-pulse rounded" />
            </div>
            <div className="h-3 w-28 bg-soft-black/5 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
