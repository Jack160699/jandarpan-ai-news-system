import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { LoadingSkeleton } from "@/features/reader-ds/system";

export default function DistrictIndexLoading() {
  if (isReaderDesignSystemEnabled()) {
    return <LoadingSkeleton activeNav="district" />;
  }

  return (
    <div className="route-loading route-loading--premium nr-wrap py-4" aria-busy="true" aria-label="Loading district">
      <div className="h-8 w-48 bg-muted rounded mb-4 animate-pulse" />
      <div className="h-64 bg-muted rounded mb-4 animate-pulse" />
    </div>
  );
}
