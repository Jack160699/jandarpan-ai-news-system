"use client";

import Link from "next/link";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { formatHomeTime } from "@/lib/homepage/format";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { HomeArticle } from "@/lib/homepage/types";

type LiveWireSectionProps = {
  updates: HomeArticle[];
};

export function LiveWireSection({ updates }: LiveWireSectionProps) {
  const { language } = useLanguage();

  if (!updates.length) return null;

  return (
    <section
      className="home-v31__section home-v31__enter"
      aria-labelledby="home-v31-live-title"
    >
      <SectionHeader
        title={pickBilingualLabel(language, "Live Wire", "लाइव अपडेट")}
        kicker={pickBilingualLabel(language, "Now", "अभी")}
      />
      <h2 id="home-v31-live-title" className="sr-only">
        Live Wire
      </h2>

      <div className="home-v31-live-rail" role="list">
        {updates.map((item) => (
          <Link
            key={item.id}
            href={`/story/${item.slug}`}
            className="home-v31-live-card tap-target"
            role="listitem"
          >
            <div className="home-v31-live-card__head">
              <span
                className="home-v31-live-dot home-v31-live-dot--pulse"
                aria-hidden
              />
              <span className="home-v31-live-card__label">
                {item.isLive
                  ? pickBilingualLabel(language, "Live", "लाइव")
                  : pickBilingualLabel(language, "Update", "अपडेट")}
              </span>
              <time className="home-v31-live-card__time">
                {formatHomeTime(item.publishedAt, language)}
              </time>
            </div>
            <p className="home-v31-live-card__headline">{item.headline}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
