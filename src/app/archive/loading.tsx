import { ProfileV3Skeleton } from "@/features/profile-v3";
import { isProfileV3Enabled } from "@/features/profile-v3/config";
import { PageContainer } from "@/layouts";
import "@/features/profile-v3/styles/profile-v3.css";

export default function ArchiveLoading() {
  if (isProfileV3Enabled()) {
    return (
      <PageContainer width="default" className="pv3-page">
        <ProfileV3Skeleton />
      </PageContainer>
    );
  }

  return null;
}
