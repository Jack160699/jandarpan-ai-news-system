import { OfflineReaderPage } from "@/features/reader-ds/offline/OfflineReaderPage";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: `Offline article · ${BRAND.nameEn}`,
  description: "Read a downloaded article offline.",
  path: "/archive/offline/read",
});

export default async function ArchiveOfflineReadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isReaderDesignSystemEnabled()) redirect("/archive");
  const { slug } = await params;
  return <OfflineReaderPage slug={slug} />;
}
