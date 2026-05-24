"use client";

import Link from "next/link";
import { SectionHeader } from "@/components/homepage/SectionHeader";
import type { HyperlocalFeedSummary } from "@/lib/homepage/types";
import { useLanguage } from "@/providers/LanguageProvider";

type HyperlocalFeedsProps = {
  feeds: HyperlocalFeedSummary[];
};

export function HyperlocalFeeds({ feeds }: HyperlocalFeedsProps) {
  const { t } = useLanguage();
  if (!feeds.length) return null;

  return (
    <section
      id="local"
      className="nr-section nr-section--hyperlocal scroll-mt-24"
      aria-labelledby="hyperlocal-heading"
    >
      <div className="nr-wrap">
        <SectionHeader
          id="hyperlocal-heading"
          title={t.home.hyperlocal}
        />

        <ul className="nr-hyperlocal__grid nr-hyperlocal__grid--daily" role="list">
          {feeds.map((f) => (
            <li key={f.districtSlug}>
              <Link
                href={`/district/${f.districtSlug}`}
                className="nr-hyperlocal__card tap-target"
              >
                <span className="nr-hyperlocal__district-hi">
                  {f.districtName}
                </span>
                {f.topHeadline ? (
                  <p className="nr-hyperlocal__headline">{f.topHeadline}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
