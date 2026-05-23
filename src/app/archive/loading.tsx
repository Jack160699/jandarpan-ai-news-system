import { TrendingStoriesSkeleton } from "@/components/loading";

export default function ArchiveLoading() {
  return (
    <div
      className="route-loading route-loading--premium nr-wrap py-6 pl-stagger"
      aria-busy="true"
      aria-label="Loading saved stories"
    >
      <TrendingStoriesSkeleton count={6} />
    </div>
  );
}
