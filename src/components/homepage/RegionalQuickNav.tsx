"use client";

import Link from "next/link";
import { CG_DISTRICTS } from "@/lib/regional/districts";
import { NAV_CATEGORIES } from "@/lib/navigation";
import type { HyperlocalFeedSummary } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

type RegionalQuickNavProps = {
  hyperlocalFeeds?: HyperlocalFeedSummary[];
  trendingTags?: string[];
};

const PRIORITY_DISTRICTS = CG_DISTRICTS.filter((d) => d.priority <= 2).slice(
  0,
  8
);

export function RegionalQuickNav({
  hyperlocalFeeds = [],
  trendingTags = [],
}: RegionalQuickNavProps) {
  const { language } = useLanguage();
  const feedSlugs = new Set(hyperlocalFeeds.map((f) => f.districtSlug));
  const districts =
    hyperlocalFeeds.length > 0
      ? hyperlocalFeeds.slice(0, 8).map((f) => ({
          slug: f.districtSlug,
          name: f.districtName,
          nameHi: f.districtNameHi,
          active: true,
        }))
      : PRIORITY_DISTRICTS.map((d) => ({
          slug: d.slug,
          name: d.name,
          nameHi: d.nameHi,
          active: feedSlugs.has(d.slug),
        }));

  const tags = trendingTags.slice(0, 6);
  const navChips = NAV_CATEGORIES.slice(0, 6);

  return (
    <nav
      className="nr-quicknav"
      aria-label="Hamaar Chhattisgarh — districts and topics"
    >
      <div className="nr-wrap">
        <div className="nr-quicknav__brand">
          <span className="nr-quicknav__emblem" aria-hidden>
            36
          </span>
          <div>
            <p className="nr-quicknav__title">जन दर्पण छत्तीसगढ़</p>
            <p className="nr-quicknav__sub">Hamaar Chhattisgarh</p>
          </div>
        </div>

        <div className="nr-quicknav__group">
          <span className="nr-quicknav__label">जिला</span>
          <ul className="nr-quicknav__chips" role="list">
            {districts.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/district/${d.slug}`}
                  className={`nr-chip nr-chip--district${"active" in d && d.active ? " nr-chip--active" : ""}`}
                >
                  <span>
                    {language === "en" ? d.name : d.nameHi}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {tags.length > 0 ? (
          <div className="nr-quicknav__group">
            <span className="nr-quicknav__label">ट्रेंडिंग</span>
            <ul className="nr-quicknav__chips" role="list">
              {tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="nr-chip nr-chip--trend"
                  >
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="nr-quicknav__group">
          <span className="nr-quicknav__label">खंड</span>
          <ul className="nr-quicknav__chips" role="list">
            {navChips.map((cat) => {
              const href = cat.href.startsWith("#")
                ? `/${cat.href}`
                : cat.href;
              return (
                <li key={cat.id}>
                  <Link href={href} className="nr-chip nr-chip--nav tap-target">
                    {language === "en" ? cat.label : cat.labelHi ?? cat.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
