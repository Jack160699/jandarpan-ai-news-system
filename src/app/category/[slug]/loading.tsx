import { TrendingStoriesSkeleton } from "@/components/loading";
import { SectionHeaderSkeleton } from "@/components/loading/HomepageLoadingView";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { LoadingSkeleton } from "@/features/reader-ds/system";

export default function CategoryLoading() {
  if (isReaderDesignSystemEnabled()) {
    return <LoadingSkeleton />;
  }

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
