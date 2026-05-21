"use client";

import Link from "next/link";
import { EditionLineage } from "@/components/institution";
import { LivingArchive } from "@/sections/LivingArchive";
import { useLanguage } from "@/providers/LanguageProvider";

export function ArchivePageContent() {
  const { t } = useLanguage();

  return (
    <main
      data-narrative-root
      className="home-news-flow mobile-comfort relative z-[2] pb-24 pt-8 md:pt-12"
    >
      <div className="editorial-container mb-12">
        <Link href="/" className="article-page__back tap-target">
          {t.archive.backToEdition}
        </Link>
        <p className="archive-marker mt-8">{t.archive.marker}</p>
        <h1 className="display-lg mt-4 max-w-[14ch]">{t.archive.title}</h1>
        <p className="deck mt-6 max-w-2xl">{t.archive.description}</p>
        <EditionLineage className="mt-8" />
      </div>
      <LivingArchive />
    </main>
  );
}
