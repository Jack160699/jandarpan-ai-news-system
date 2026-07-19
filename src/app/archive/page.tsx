import { PageShell } from "@/components/layout/PageShell";
import { ArchivePageContent } from "@/sections/ArchivePageContent";
import { ProfileHubPage } from "@/features/reader-ds/experience";
import { isReaderDesignSystemEnabled } from "@/features/reader-ds/config";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { buildUtilityPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildUtilityPageMetadata({
  title: `Your Profile · ${BRAND.nameEn}`,
  description:
    "Reader preferences, saved stories, and reading history on this device — not a public news archive.",
  path: "/archive",
});

export default function ArchivePage() {
  if (isReaderDesignSystemEnabled()) {
    return <ProfileHubPage />;
  }
  return (
    <PageShell variant="news">
      <ArchivePageContent />
    </PageShell>
  );
}
