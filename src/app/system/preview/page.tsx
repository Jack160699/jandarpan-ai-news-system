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
import { PermissionPreview } from "./PermissionPreview";

/**
 * QA gallery for Group F system states (F46–F54).
 * ?state=loading|empty|error|offline|slow|notify|location|maintenance|404
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
    default:
      return <LoadingSkeleton />;
  }
}
