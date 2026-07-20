import { redirect } from "next/navigation";
import { isReaderDesignSystemQaEnabled } from "@/features/reader-ds/config";
import {
  EmptyState,
  ErrorStatePage,
  ForceNetworkDemo,
  LoadingSkeleton,
  MaintenancePage,
  NotFoundStatePage,
} from "@/features/reader-ds/system";
import { Masthead } from "@/features/reader-ds/components/Masthead";
import { ReaderShell } from "@/features/reader-ds/components/ReaderShell";
import { PhotoGallery } from "@/features/reader-ds/article/components/PhotoGallery";
import { PermissionPreview } from "./PermissionPreview";

/**
 * QA gallery for Group F system states (F46–F54).
 * ?state=loading|empty|error|offline|slow|notify|location|maintenance|404|photo
 */
export default async function SystemPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (!isReaderDesignSystemQaEnabled()) redirect("/");
  const { state = "loading" } = await searchParams;

  switch (state) {
    case "empty":
      return (
        <ReaderShell activeNav="more" showPermissionSheets={false}>
          <Masthead back backHref="/" pageTitle="सहेजे" />
          <EmptyState />
        </ReaderShell>
      );
    case "error":
      return <ErrorStatePage />;
    case "maintenance":
      return <MaintenancePage etaLabel="सुबह 6:00 बजे" />;
    case "404":
      return <NotFoundStatePage />;
    case "offline":
      return <ForceNetworkDemo mode="offline" />;
    case "slow":
      return <ForceNetworkDemo mode="slow" />;
    case "notify":
      return <PermissionPreview kind="notify" />;
    case "location":
      return <PermissionPreview kind="location" />;
    case "photo":
      return (
        <PhotoGallery
          kicker="फ़ोटो स्टोरी"
          backHref="/system/preview"
          images={[
            { src: null, caption: "रायपुर में सुबह की रौशनी — पूर्वावलोकन फ़्रेम 1", alt: "फ़ोटो 1" },
            { src: null, caption: "बाज़ार क्षेत्र — पूर्वावलोकन फ़्रेम 2", alt: "फ़ोटो 2" },
            { src: null, caption: "नदी किनारा — पूर्वावलोकन फ़्रेम 3", alt: "फ़ोटो 3" },
            { src: null, caption: "सांस्कृतिक कार्यक्रम — पूर्वावलोकन फ़्रेम 4", alt: "फ़ोटो 4" },
          ]}
        />
      );
    default:
      return <LoadingSkeleton />;
  }
}
