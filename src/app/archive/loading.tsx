import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function ArchiveLoading() {
  return (
    <div className="route-loading nr-wrap py-6" aria-busy="true" aria-label="Loading saved stories">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-8 space-y-5">
        {[1, 2, 3].map((i) => (
          <SkeletonText key={i} lines={3} />
        ))}
      </div>
    </div>
  );
}
