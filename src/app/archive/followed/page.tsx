import { FollowedTopicsPage } from "@/features/reader-ds/experience";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: `Followed topics · ${BRAND.nameEn}`,
  description: "Topics and interests you follow.",
  path: "/archive/followed",
});

export default function ArchiveFollowedPage() {
  if (!isReaderDesignSystemEnabled()) redirect("/archive");
  return <FollowedTopicsPage />;
}
