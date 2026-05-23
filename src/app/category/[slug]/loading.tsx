import { TrendingStoriesSkeleton } from "@/components/loading";
import { SectionHeaderSkeleton } from "@/components/loading/HomepageLoadingView";

export default function CategoryLoading() {
  return (
    <div
      className="route-loading route-loading--premium nr-wrap py-2 pl-stagger"
      aria-busy="true"
      aria-label="Loading category"
    >
      <SectionHeaderSkeleton />
      <TrendingStoriesSkeleton count={8} />
    </div>
  );
}
