"use client";

import Link from "next/link";
import { EditionLineage } from "@/components/institution";
import { BRAND } from "@/lib/brand";
import { INSTITUTION, NEWSROOM_DESKS, getPublishingLineage } from "@/lib/institution";
import { Rule } from "@/components/ui/Rule";
import { useLanguage } from "@/providers/LanguageProvider";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer
      id="footer"
      data-section="footer"
      className="news-scroll-target relative z-10 border-t border-[var(--rule)] bg-[var(--paper)] pb-12 pt-10"
    >
      <div className="editorial-container">
        <p className="ds-kicker">{BRAND.nameEn}</p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink-headline)]">
          {BRAND.taglineEn}
        </p>

        <Rule className="my-8" />

        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="archive-marker">{t.footer.institution}</p>
            <EditionLineage className="mt-4" />
            <p className="editorial-body mt-6 max-w-sm text-sm text-[var(--ink-muted)]">
              {getPublishingLineage()}
            </p>
            <p className="meta-label mt-6 text-[var(--ink-faint)]">
              {t.brand.conceptNote}
            </p>
          </div>

          <div className="lg:col-span-4">
            <p className="archive-marker">{t.footer.newsroom}</p>
            <ul className="mt-4 space-y-2">
              {NEWSROOM_DESKS.map((d) => (
                <li key={d.id} className="meta-label text-[var(--ink-muted)]">
                  {d.name} — {d.editor}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <p className="archive-marker">{t.footer.record}</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/archive"
                  className="editorial-body text-sm transition-opacity hover:opacity-60"
                >
                  {t.footer.livingArchive}
                </Link>
              </li>
              <li>
                <span className="editorial-body text-sm text-[var(--ink-muted)]">
                  {t.footer.ethics}
                </span>
              </li>
              <li>
                <span className="editorial-body text-sm text-[var(--ink-muted)]">
                  {t.footer.contact}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <Rule className="my-12" />

        <div className="flex flex-col gap-3 text-[var(--ink-faint)] sm:flex-row sm:justify-between">
          <p className="meta-label">
            © {new Date().getFullYear()} {INSTITUTION.name} · {t.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
