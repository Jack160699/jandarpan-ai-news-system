import { AccessibilityPage } from "@/features/reader-ds/experience";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";
import { BRAND } from "@/lib/brand";
import { redirect } from "next/navigation";

export const metadata = buildUtilityPageMetadata({
  title: `Accessibility & data-saving · ${BRAND.nameEn}`,
  description: "Text size, contrast, dark mode, and data-saving preferences.",
  path: "/archive/accessibility",
});

export default function ArchiveAccessibilityPage() {
  if (!isReaderDesignSystemEnabled()) redirect("/archive");
  return <AccessibilityPage />;
}
