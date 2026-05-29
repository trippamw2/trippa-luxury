import { SkeletonTable } from "@/app/admin/components/Skeleton";

export default function PropertiesLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-32 bg-soft-black/5 animate-pulse rounded" />
          <div className="h-4 w-48 bg-soft-black/5 animate-pulse rounded mt-2" />
        </div>
        <div className="h-10 w-40 bg-soft-black/5 animate-pulse rounded" />
      </div>
      <div className="bg-white border border-sand-light p-4 mb-6">
        <div className="h-10 w-full bg-soft-black/5 animate-pulse rounded" />
      </div>
      <div className="bg-white border border-sand-light p-4">
        <SkeletonTable rows={5} cols={7} />
      </div>
    </div>
  );
}
