import { LanguageGate } from "@/components/reader/LanguageGate";
import { ConceptBanner } from "@/components/institution/ConceptBanner";
import { EditionLineage } from "@/components/institution";
import { PageShell } from "@/components/layout/PageShell";
import { LivingArchive } from "@/sections/LivingArchive";
import { BRAND } from "@/lib/brand";
import { webPageJsonLd } from "@/lib/seo";
import Link from "next/link";

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
      <LanguageGate />
      <ConceptBanner />
      <main
        data-narrative-root
        className="home-news-flow mobile-comfort relative z-[2] pb-24 pt-8 md:pt-12"
      >
        <div className="editorial-container mb-12">
          <Link
            href="/"
            className="article-page__back tap-target"
          >
            ← Today&apos;s edition
          </Link>
          <p className="archive-marker mt-8">Institutional record · अभिलेख</p>
          <h1 className="display-lg mt-4 max-w-[14ch]">Living archive</h1>
          <p className="deck mt-6 max-w-2xl">
            A chronology of CG Bhaskar filings — investigations, dispatches, and
            cultural memory across Chhattisgarh.
          </p>
          <EditionLineage className="mt-8" />
        </div>
        <LivingArchive />
      </main>
    </PageShell>
  );
}
