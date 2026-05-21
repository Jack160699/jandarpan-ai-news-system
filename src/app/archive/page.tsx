import { AtmosphereController } from "@/components/cinema";
import { LanguageGate } from "@/components/reader/LanguageGate";
import { ConceptBanner } from "@/components/institution/ConceptBanner";
import { EditionLineage } from "@/components/institution";
import { PageShell } from "@/components/layout/PageShell";
import { LivingArchive } from "@/sections/LivingArchive";
import { BRAND } from "@/lib/brand";
import Link from "next/link";

export const metadata = {
  title: `Living Archive · ${BRAND.nameEn} Concept`,
  description:
    "Editorial chronology and ongoing investigations — CG Bhaskar concept archive.",
};

export default function ArchivePage() {
  return (
    <PageShell>
      <LanguageGate />
      <ConceptBanner />
      <AtmosphereController />
      <main
        data-narrative-root
        data-atmosphere="cool"
        className="mobile-comfort relative z-[2] pb-24 pt-10 md:pt-12"
      >
        <div className="editorial-container mb-12">
          <Link
            href="/"
            className="meta-label text-[var(--ink-muted)] hover:opacity-60"
          >
            ← Today&apos;s edition
          </Link>
          <p className="archive-marker mt-10">Institutional record · अभिलेख</p>
          <h1 className="display-lg mt-4 max-w-[14ch]">Living archive</h1>
          <p className="deck mt-8 max-w-2xl">
            A chronology of CG Bhaskar filings — investigations, dispatches, and
            cultural memory across Chhattisgarh. Arranged as editors remember, not
            as an algorithm ranks.
          </p>
          <EditionLineage className="mt-10" />
        </div>
        <LivingArchive />
      </main>
    </PageShell>
  );
}
