import { ConceptBanner } from "@/components/institution/ConceptBanner";
import { EditionLineage } from "@/components/institution";
import { PageShell } from "@/components/layout/PageShell";
import { ArchivePageContent } from "@/sections/ArchivePageContent";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { PRODUCTION_ROBOTS, SITE_URL, webPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Living Archive",
  description:
    "Editorial chronology and ongoing investigations — CG Bhaskar archive for Chhattisgarh.",
  alternates: { canonical: "/archive" },
  robots: PRODUCTION_ROBOTS,
  openGraph: {
    title: `Living Archive · ${BRAND.nameEn}`,
    description:
      "Editorial chronology and ongoing investigations — Chhattisgarh regional archive.",
    type: "website",
    url: `${SITE_URL}/archive`,
    locale: "hi_IN",
    siteName: BRAND.nameEn,
  },
  twitter: {
    card: "summary",
    title: `Living Archive · ${BRAND.nameEn}`,
    description:
      "Editorial chronology and ongoing investigations — Chhattisgarh regional archive.",
  },
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
