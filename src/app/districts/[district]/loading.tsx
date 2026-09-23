import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { LoadingSkeleton } from "@/features/reader-ds/system";
import { PageContainer } from "@/layouts/PageContainer";
import { DistrictV3Skeleton } from "@/features/district-v3/skeletons";

export default function DistrictParamLoading() {
  if (isReaderDesignSystemEnabled()) {
    return <LoadingSkeleton />;
  }

  return (
    <PageContainer width="default" className="dv3-page">
      <DistrictV3Skeleton />
    </PageContainer>
  );
}
