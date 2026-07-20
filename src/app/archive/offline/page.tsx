import { OfflineLibraryPage } from "@/features/reader-ds/offline/OfflineLibraryPage";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: `Offline downloads · ${BRAND.nameEn}`,
  description: "Articles downloaded for offline reading on this device.",
  path: "/archive/offline",
});

export default async function ArchiveOfflinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!isReaderDesignSystemEnabled()) redirect("/archive");
  const sp = await searchParams;
  return <OfflineLibraryPage initialQuery={sp.q ?? ""} />;
}
