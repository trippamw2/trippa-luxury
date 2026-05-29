import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/** A single animated skeleton block with gold shimmer */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-sand-light/40 via-gold/10 to-sand-light/40 bg-[length:200%_100%] animate-shimmer",
        className
      )}
    />
  );
}

/** Text line placeholders — mimics 1-3 lines of text */
export function SkeletonText({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 && lines > 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

/** A card-shaped skeleton for list/grid loading states */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white border border-sand-light p-5 space-y-4", className)}>
      <Skeleton className="h-5 w-1/3" />
      <SkeletonText lines={2} />
      <Skeleton className="h-8 w-1/4" />
    </div>
  );
}

/** Table row skeleton — n columns of varying width */
export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-4 px-4 py-3.5 border-b border-sand-light/50">
          {Array.from({ length: cols }).map((_, ci) => (
            <Skeleton
              key={ci}
              className={cn("h-3 flex-1", ci === 0 ? "w-1/6" : ci === cols - 1 ? "w-1/12" : "")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
