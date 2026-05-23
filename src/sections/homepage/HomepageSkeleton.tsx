import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export function HomepageSkeleton() {
  return (
    <div className="nr" aria-busy="true" aria-label="Loading newsroom">
      <div className="nr-ticker nr-ticker--skeleton">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 flex-1" />
      </div>

      <div className="nr-wrap nr-section nr-section--editorial py-10">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-4 h-10 max-w-md w-full" />
        <Skeleton className="mt-8 aspect-[16/10] w-full max-h-[320px]" />
        <Skeleton className="mt-6 h-12 max-w-2xl w-full" />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] w-full" />
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      </div>

      <div className="nr-wrap nr-section py-8">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-8 w-48" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-4 w-14 shrink-0" />
              <SkeletonText lines={1} className="flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
