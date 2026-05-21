import { ConceptBanner } from "@/components/institution/ConceptBanner";
import { EditionLineage } from "@/components/institution";
import { PageShell } from "@/components/layout/PageShell";
import { ArchivePageContent } from "@/sections/ArchivePageContent";
import { webPageJsonLd } from "@/lib/seo";

export const metadata = {
  title: "Living Archive",
  description:
    "Editorial chronology and ongoing investigations — CG Bhaskar concept archive for Chhattisgarh.",
  alternates: { canonical: "/archive" },
};

export default function ArchivePage() {
  const jsonLd = webPageJsonLd(
    "Living Archive",
    "Chronology of CG Bhaskar filings and investigations.",
    "/archive"
  );

  return (
    <PageShell variant="news">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ConceptBanner />
      <ArchivePageContent />
    </PageShell>
  );
}
