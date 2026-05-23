import { Skeleton } from "@/components/ui/Skeleton";

export default function CategoryLoading() {
  return (
    <div className="route-loading category-hub" aria-busy="true" aria-label="Loading category">
      <div className="nr-wrap py-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-10 w-2/3 max-w-md" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
        <div className="mt-8 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="nr-shimmer aspect-[16/10] w-full max-h-[200px] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
