import { DistrictPrefsPage } from "@/features/reader-ds/experience";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: `District preferences · ${BRAND.nameEn}`,
  description: "Set your primary and followed districts.",
  path: "/archive/districts",
});

export default function ArchiveDistrictsPage() {
  if (!isReaderDesignSystemEnabled()) redirect("/district");
  return <DistrictPrefsPage />;
}
