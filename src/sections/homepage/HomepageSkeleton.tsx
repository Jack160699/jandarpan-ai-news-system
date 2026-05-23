import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export function HomepageSkeleton() {
  return (
    <div className="nr nr--premium" aria-busy="true" aria-label="Loading newsroom">
      <div className="nr-ticker nr-ticker--live nr-ticker--skeleton">
        <Skeleton className="h-10 w-16 shrink-0" />
        <Skeleton className="h-4 flex-1" />
      </div>
      <div className="breaking-rail">
        <div className="nr-wrap flex gap-2 overflow-hidden py-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="nr-shimmer h-28 min-w-[260px] shrink-0 rounded-lg"
            />
          ))}
        </div>
      </div>

      <div className="nr-wrap nr-hero-zone py-3">
        <div className="nr-shimmer aspect-[16/10] w-full max-h-[220px] rounded-xl" />
        <Skeleton className="mt-3 h-8 w-full max-w-lg" />
        <Skeleton className="mt-2 h-4 w-3/4 max-w-md" />
        <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr]">
          <div className="nr-shimmer aspect-[9/14] w-full max-h-[280px] rounded-xl" />
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="nr-shimmer h-24 min-w-[200px] shrink-0 rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="nr-quicknav">
        <div className="nr-wrap">
          <div className="flex gap-2 overflow-hidden py-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="nr-shimmer h-9 w-20 shrink-0 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="nr-wrap nr-section py-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-8 w-48" />
        <div className="mt-5 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-14 w-14 shrink-0" />
              <SkeletonText lines={2} className="flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
