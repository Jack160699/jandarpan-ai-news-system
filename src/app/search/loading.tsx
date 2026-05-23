import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function SearchLoading() {
  return (
    <div className="route-loading nr-wrap py-6" aria-busy="true" aria-label="Loading search">
      <Skeleton className="h-10 w-full max-w-lg rounded-lg" />
      <div className="mt-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-16 w-16 shrink-0 rounded-md" />
            <SkeletonText lines={2} className="flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
