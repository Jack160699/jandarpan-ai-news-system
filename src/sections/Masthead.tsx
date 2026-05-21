"use client";

import Link from "next/link";
import { MastheadControls } from "@/components/reader/MastheadControls";
import { LiveDeskMarker } from "@/components/editorial/LiveDeskMarker";
import { EditionLineage } from "@/components/institution";
import { useReaderPreferencesOptional } from "@/providers/ReaderPreferencesProvider";
import { Dateline } from "@/components/newspaper/Dateline";
import { Rule } from "@/components/ui/Rule";
import { FadeUp } from "@/components/motion/FadeUp";
import { formatEditionTimestamp } from "@/lib/live-edition";
import { BRAND, EDITORIAL_CATEGORIES, REGIONAL_MARKERS } from "@/lib/brand";
import { INSTITUTION } from "@/lib/institution";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";

export function Masthead() {
  const ctx = useEditorialIntelligenceOptional();
  const reader = useReaderPreferencesOptional();
  const dateLabel = formatEditionTimestamp();
  const explored = ctx ? Object.keys(ctx.memory.sections).length : 0;
  const lang = reader?.prefs.language ?? "hi";
  const showHi = lang === "hi" || lang === "cg";

  return (
    <header
      data-section="masthead"
      className="masthead-cgb relative z-10 border-b border-[var(--rule)]"
    >
      <MastheadControls />
      <div className="masthead-cgb__rule-brand" aria-hidden />

      <div className="editorial-container py-4 md:py-5">
        <FadeUp className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="regional-badge">{INSTITUTION.regionalEdition}</span>
            </div>
            <Dateline
              date={dateLabel}
              edition={`Vol. ${INSTITUTION.volume} · Ed. ${INSTITUTION.editionNumber}`}
              className="mt-3"
            />
            <EditionLineage compact className="mt-2" />
          </div>
          <LiveDeskMarker />
        </FadeUp>
        {explored > 2 ? (
          <p className="meta-label mt-3 text-[var(--ink-faint)]">
            आपने आज {explored} अनुभाग पढ़े · Your path through the edition
          </p>
        ) : null}
      </div>

      <div className="editorial-container pb-6 pt-4 text-center md:pb-10 md:pt-6">
        <h1 className="sr-only">
          {BRAND.nameEn} — {BRAND.nameHi}
        </h1>
        <p
          className="masthead-title-en"
          aria-hidden
          style={showHi ? { fontSize: "clamp(2rem, 8vw, 4.5rem)" } : undefined}
        >
          {showHi ? BRAND.nameHi : BRAND.nameEn}
        </p>
        {showHi ? (
          <p className="masthead-title-hi mt-2 md:mt-3 text-[var(--ink-muted)]" aria-hidden>
            {lang === "cg" ? "छत्तीसगढ़ के लिए · For Chhattisgarh" : BRAND.nameEn}
          </p>
        ) : (
          <p className="masthead-title-hi mt-2 md:mt-3" aria-hidden>
            {BRAND.nameHi}
          </p>
        )}
        <p className="meta-label mt-4 text-[var(--ink-muted)]">
          {showHi ? BRAND.taglineHi : BRAND.taglineEn}
        </p>
        {showHi ? (
          <p className="meta-label mt-1 text-[var(--ink-faint)]">{BRAND.taglineEn}</p>
        ) : (
          <p
            className="mt-1 text-sm text-[var(--ink-faint)]"
            style={{ fontFamily: "var(--font-hindi)" }}
          >
            {BRAND.taglineHi}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {REGIONAL_MARKERS.map((m) => (
            <span
              key={m}
              className="meta-label text-[10px] text-[var(--ink-faint)] md:text-[0.6875rem]"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      <Rule weight="hairline" />

      <nav
        className="category-nav editorial-container overflow-x-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Sections"
      >
        <ul className="flex min-w-max gap-6 md:justify-center md:gap-8">
          {EDITORIAL_CATEGORIES.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="meta-label whitespace-nowrap transition-colors duration-500 hover:text-[var(--brand-maroon-deep)]"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
