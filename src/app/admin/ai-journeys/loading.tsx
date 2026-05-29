export default function AIJourneysLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-7 w-48 bg-soft-black/5 animate-pulse rounded" />
        <div className="h-4 w-72 bg-soft-black/5 animate-pulse rounded mt-1" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-100 p-6 space-y-4">
            <div className="h-5 w-32 bg-soft-black/5 animate-pulse rounded" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-full bg-soft-black/5 animate-pulse rounded" />
            ))}
            <div className="h-11 w-full bg-soft-black/5 animate-pulse rounded" />
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-100 p-12 text-center">
            <div className="w-10 h-10 mx-auto mb-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <div className="h-4 w-48 mx-auto bg-soft-black/5 animate-pulse rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
