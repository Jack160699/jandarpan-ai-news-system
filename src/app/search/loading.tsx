import { StoryCardSkeleton } from "@/components/loading";
import { Skeleton } from "@/components/ui/Skeleton";

export default function SearchLoading() {
  return (
    <div
      className="route-loading route-loading--premium nr-wrap py-6 pl-stagger"
      aria-busy="true"
      aria-label="Loading search"
    >
      <Skeleton className="pl-search-bar pl-stagger-item w-full max-w-lg rounded-lg" />
      <div className="mt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="pl-stagger-item">
            <StoryCardSkeleton compact />
          </div>
        ))}
      </div>
    </div>
  );
}
