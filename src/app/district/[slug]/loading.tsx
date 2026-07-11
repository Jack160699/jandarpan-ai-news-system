import { DistrictV3Skeleton } from "@/features/district-v3/skeletons";
import { isDistrictV3Enabled } from "@/features/district-v3/config";
import "@/features/district-v3/styles/district-v3.css";
import { PageContainer } from "@/layouts/PageContainer";

export default function DistrictLoading() {
  if (!isDistrictV3Enabled()) {
    return null;
  }

  return (
    <PageContainer width="default" className="dv3-page">
      <DistrictV3Skeleton />
    </PageContainer>
  );
}
