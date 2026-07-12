"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { DistrictQuickSwitch } from "@/components/personalization/DistrictQuickSwitch";
import { LocalBreakingAlerts } from "@/components/homepage/LocalBreakingAlerts";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { formatHomeTime } from "@/lib/homepage/format";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";

type LocalPulseSectionProps = {
  districtName: string;
  districtNameHi: string;
  localAlerts: GeneratedHomepageFeed["localBreakingAlerts"];
  topDistrictStory: HomeArticle | null;
};

export function LocalPulseSection({
  districtName,
  districtNameHi,
  localAlerts,
  topDistrictStory,
}: LocalPulseSectionProps) {
  const { language } = useLanguage();
  const districtLabel = pickBilingualLabel(language, districtName, districtNameHi);
  const dateLabel = new Date().toLocaleDateString(
    language === "hi" ? "hi-IN" : "en-IN",
    { weekday: "short", month: "short", day: "numeric" }
  );

  return (
    <section className="home-v31__section home-v31__enter" aria-label="Local news">
      <div className="home-v31-pulse">
        <div className="home-v31-pulse__context">
          <MapPin size={16} aria-hidden className="home-v31-pulse__icon" />
          <h2 className="home-v31-pulse__title">
            {pickBilingualLabel(language, "Near", "आपके पास")}{" "}
            <span className="home-v31-pulse__district">{districtLabel}</span>
          </h2>
          <span className="home-v31-pulse__date">{dateLabel}</span>
        </div>

        <DistrictQuickSwitch />

        {localAlerts.length > 0 ? (
          <LocalBreakingAlerts alerts={localAlerts} />
        ) : null}

        {topDistrictStory ? (
          <Link
            href={`/story/${topDistrictStory.slug}`}
            className="home-v31-pulse__lead tap-target"
          >
            <span className="home-v31-pulse__lead-kicker">
              {pickBilingualLabel(language, "Top local", "स्थानीय शीर्ष")}
            </span>
            <span className="home-v31-pulse__lead-headline">
              {topDistrictStory.headline}
            </span>
            <span className="home-v31-pulse__lead-meta">
              {formatHomeTime(topDistrictStory.publishedAt, language)}
              {topDistrictStory.readingTime
                ? ` · ${topDistrictStory.readingTime}`
                : ""}
            </span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
