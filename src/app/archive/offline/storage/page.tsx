import { OfflineStoragePage } from "@/features/reader-ds/offline/OfflineStoragePage";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: `Offline storage · ${BRAND.nameEn}`,
  description: "Manage offline article storage on this device.",
  path: "/archive/offline/storage",
});

export default function ArchiveOfflineStoragePage() {
  if (!isReaderDesignSystemEnabled()) redirect("/archive");
  return <OfflineStoragePage />;
}
