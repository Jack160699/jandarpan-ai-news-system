import { PageShell } from "@/components/layout/PageShell";
import { ArchivePageContent } from "@/sections/ArchivePageContent";
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
  return (
    <PageShell variant="news">
      <ArchivePageContent />
    </PageShell>
  );
}
