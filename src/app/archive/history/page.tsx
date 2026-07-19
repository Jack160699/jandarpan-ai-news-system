import { ReadingHistoryPage } from "@/features/reader-ds/experience";
import { loadReaderCatalog } from "@/features/reader-ds/experience/loadCatalog";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: `Reading history · ${BRAND.nameEn}`,
  description: "Your recent reading history on this device.",
  path: "/archive/history",
});

export default async function ArchiveHistoryPage() {
  if (!isReaderDesignSystemEnabled()) redirect("/archive");
  const catalog = await loadReaderCatalog();
  return <ReadingHistoryPage catalog={catalog} />;
}
