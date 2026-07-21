import { LanguagePage } from "@/features/reader-ds/experience";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: `Language · ${BRAND.nameEn}`,
  description: "Choose your reading language.",
  path: "/archive/language",
});

export default function ArchiveLanguagePage() {
  if (!isReaderDesignSystemEnabled()) redirect("/archive");
  return <LanguagePage />;
}
