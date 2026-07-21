"use client";

import Link from "next/link";
import { useJdDsT } from "../i18n";
import type { BreakingItem } from "../homepage/breaking";

type BreakingStripProps = {
  /** @deprecated Prefer `items` — single headline kept for callers. */
  headline?: string | null;
  href?: string;
  items?: BreakingItem[];
};

/**
 * Live breaking strip — pulsing indicator, stable Hindi label, full headline
 * (no premature ellipsis). Multi-item tracks use CSS motion only.
 */
export function BreakingStrip({ headline, href = "#", items }: BreakingStripProps) {
  const { t, locale } = useJdDsT();

  const list: BreakingItem[] =
    items && items.length
      ? items
      : headline?.trim()
        ? [{ slug: "legacy", headline: headline.trim(), href }]
        : [];

  if (!list.length) return null;

  const primary = list[0];
  const multi = list.length > 1;

  return (
    <div
      className="jd-ui jd-breaking-strip"
      data-jd-locale={locale}
      data-testid="jd-breaking-strip"
      role="region"
      aria-label={t("common.breaking")}
    >
      <span className="jd-breaking-strip__badge" aria-hidden={false}>
        <span className="jd-breaking-strip__pulse" aria-hidden />
        <span className="jd-breaking-strip__label">{t("common.breaking")}</span>
      </span>

      {multi ? (
        <div className="jd-breaking-strip__track-wrap">
          <ul className="jd-breaking-strip__track">
            {/* Duplicate once for seamless CSS loop; aria-hidden on clone */}
            {[0, 1].map((copy) =>
              list.map((item) => (
                <li key={`${copy}-${item.slug}`} aria-hidden={copy === 1 ? true : undefined}>
                  <Link
                    href={item.href}
                    className="jd-breaking-strip__item"
                    tabIndex={copy === 1 ? -1 : undefined}
                    title={item.headline}
                  >
                    <span className="jd-serif jd-breaking-strip__headline">{item.headline}</span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : (
        <Link
          href={primary.href}
          className="jd-breaking-strip__item jd-breaking-strip__item--solo"
          title={primary.headline}
        >
          <span className="jd-serif jd-breaking-strip__headline">{primary.headline}</span>
        </Link>
      )}

      {multi ? (
        <span className="sr-only">
          {t("common.breaking")}: {primary.headline}
        </span>
      ) : null}
    </div>
  );
}
