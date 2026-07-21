import { SavedStoriesPage } from "@/features/reader-ds/experience";
import { loadReaderCatalog } from "@/features/reader-ds/experience/loadCatalog";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: `Saved stories · ${BRAND.nameEn}`,
  description: "Stories you saved on this device.",
  path: "/archive/saved",
});

export default async function ArchiveSavedPage() {
  if (!isReaderDesignSystemEnabled()) redirect("/archive#saved-stories");
  const catalog = await loadReaderCatalog();
  return <SavedStoriesPage catalog={catalog} />;
}
