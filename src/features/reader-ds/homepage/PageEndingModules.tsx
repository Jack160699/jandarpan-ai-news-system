"use client";

import Link from "next/link";
import type { ReaderStory } from "../utils";
import { storyHref } from "../utils";
import { useJdDsT } from "../i18n";
import { FOOTER_DISTRICT_SLUGS, districtFooterHref } from "../homepage/footer-links";
import { getPrioritizedDistricts } from "@/lib/regional/districts";

export type PageEndingCategory = { href: string; label: string };

export type PageEndingModulesProps = {
  latest: ReaderStory[];
  mostRead: ReaderStory[];
  categories: PageEndingCategory[];
  /** Slugs already used above the fold — avoid repeating excessively. */
  excludeSlugs?: Set<string>;
};

/**
 * Editorial page ending — real content modules before the publication footer.
 * Lightweight lists only; does not fetch.
 */
export function PageEndingModules({
  latest,
  mostRead,
  categories,
  excludeSlugs,
}: PageEndingModulesProps) {
  const { t, locale } = useJdDsT();
  const used = new Set(excludeSlugs ?? []);

  const takeUnique = (pool: ReaderStory[], n: number) => {
    const out: ReaderStory[] = [];
    for (const s of pool) {
      if (!s?.slug || !s.headline?.trim() || used.has(s.slug)) continue;
      used.add(s.slug);
      out.push(s);
      if (out.length >= n) break;
    }
    return out;
  };

  const latestItems = takeUnique(latest, 4);
  const mostReadItems = takeUnique(mostRead, 4);

  const districts = FOOTER_DISTRICT_SLUGS.map((slug) => {
    const d = getPrioritizedDistricts().find((x) => x.slug === slug);
    return {
      href: districtFooterHref(slug),
      label: locale === "en" ? (d?.name ?? slug) : (d?.nameHi ?? d?.name ?? slug),
    };
  }).slice(0, 6);

  const cats = categories.filter((c) => c.href && c.label?.trim()).slice(0, 8);

  return (
    <section
      className="jd-page-ending jd-home-ending"
      data-testid="jd-page-ending"
      data-jd-home-ending="1"
      aria-label={t("home.endingAria")}
    >
      {latestItems.length ? (
        <EndingStoryList
          title={t("home.endingLatest")}
          items={latestItems}
          moreHref="/latest"
          moreLabel={t("common.seeAll")}
          testId="jd-ending-latest"
        />
      ) : null}

      {mostReadItems.length ? (
        <EndingStoryList
          title={t("home.endingMostRead")}
          items={mostReadItems}
          moreHref="/trending"
          moreLabel={t("common.seeAll")}
          testId="jd-ending-most-read"
        />
      ) : null}

      {cats.length ? (
        <div className="jd-page-ending__block" data-testid="jd-ending-categories">
          <h2 className="jd-serif jd-page-ending__title">{t("home.endingCategories")}</h2>
          <ul className="jd-page-ending__chips jd-ui">
            {cats.map((c) => (
              <li key={c.href}>
                <Link href={c.href}>{c.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {districts.length ? (
        <div className="jd-page-ending__block" data-testid="jd-ending-districts">
          <h2 className="jd-serif jd-page-ending__title">{t("home.endingDistricts")}</h2>
          <ul className="jd-page-ending__chips jd-ui">
            {districts.map((d) => (
              <li key={d.href}>
                <Link href={d.href}>{d.label}</Link>
              </li>
            ))}
            <li>
              <Link href="/district?select=1">{t("footer.allDistricts")}</Link>
            </li>
          </ul>
        </div>
      ) : null}

      <div
        className="jd-page-ending__support"
        data-testid="jd-ending-support"
      >
        <h2 className="jd-serif jd-page-ending__title">{t("home.supportJournalism")}</h2>
        <p className="jd-ui jd-page-ending__support-copy">{t("home.supportJournalismSub")}</p>
        <Link className="jd-page-ending__cta jd-ui" href="/membership">
          {t("desk.becomeMember")} →
        </Link>
      </div>
    </section>
  );
}

function EndingStoryList({
  title,
  items,
  moreHref,
  moreLabel,
  testId,
}: {
  title: string;
  items: ReaderStory[];
  moreHref: string;
  moreLabel: string;
  testId: string;
}) {
  return (
    <div className="jd-page-ending__block" data-testid={testId}>
      <div className="jd-page-ending__head">
        <h2 className="jd-serif jd-page-ending__title">{title}</h2>
        <Link className="jd-ui jd-page-ending__more" href={moreHref}>
          {moreLabel}
        </Link>
      </div>
      <ol className="jd-page-ending__stories jd-ui">
        {items.map((s, i) => (
          <li key={s.slug}>
            <Link href={storyHref(s.slug)}>
              <span className="jd-page-ending__rank" aria-hidden>
                {i + 1}
              </span>
              <span className="jd-page-ending__headline">{s.headline}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
