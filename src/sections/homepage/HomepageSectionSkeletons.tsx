import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export function LiveWireSkeleton() {
  return (
    <div className="live-wire hp-skeleton-block" aria-hidden>
      <div className="nr-wrap">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-1 h-5 w-28" />
      </div>
      <div className="bwire-rail mt-2">
        <div className="bwire-rail__track">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bwire-rail__slot">
              <Skeleton className="h-14 w-full rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RegionalHighlightsSkeleton() {
  return (
    <div className="nr-section hp-skeleton-block" aria-hidden>
      <div className="nr-wrap">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-8 w-56" />
        <div className="mt-4 nr-shimmer aspect-[16/10] max-h-[220px] w-full rounded-xl" />
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-16 w-16 shrink-0 rounded-md" />
              <SkeletonText lines={2} className="flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HyperlocalSkeleton() {
  return (
    <div className="nr-section hp-skeleton-block" aria-hidden>
      <div className="nr-wrap">
        <Skeleton className="h-8 w-48" />
        <div className="mt-4 flex gap-2 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 min-w-[200px] shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrendingShortsSkeleton() {
  return (
    <div className="trending-shorts hp-skeleton-block" aria-hidden>
      <div className="nr-wrap">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-44" />
      </div>
      <div className="hp-skeleton-rail mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="hp-skeleton-rail__slot hp-skeleton-rail__slot--reel">
            <div className="nr-shimmer aspect-[9/14] w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryStreamsSkeleton() {
  return (
    <div className="nr-section hp-skeleton-block" aria-hidden>
      <div className="nr-wrap">
        <Skeleton className="h-8 w-40" />
        <div className="mt-6 space-y-6">
          {[1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="h-5 w-32" />
              <div className="mt-3 nr-shimmer aspect-[4/3] w-full max-h-[180px] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function QuickReadsSkeleton() {
  return (
    <div className="nr-section hp-skeleton-block" aria-hidden>
      <div className="nr-wrap space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-14 w-14 shrink-0 rounded-md" />
            <SkeletonText lines={2} className="flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FooterIntelSkeleton() {
  return (
    <div className="nr-section hp-skeleton-block" aria-hidden>
      <div className="nr-wrap">
        <Skeleton className="h-8 w-52" />
        <div className="mt-4 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
