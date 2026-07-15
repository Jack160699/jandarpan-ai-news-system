"use client";

import Link from "next/link";
import { DistrictQuickSwitch } from "@/components/personalization/DistrictQuickSwitch";
import { LocalBreakingAlerts } from "@/components/homepage/LocalBreakingAlerts";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";

type LocalPulseSectionProps = {
  districtName: string;
  districtNameHi: string;
  localAlerts: GeneratedHomepageFeed["localBreakingAlerts"];
  breakingStory: GeneratedHomepageFeed["editorsPicks"]["lead"] | null;
};

export function LocalPulseSection({
  localAlerts,
  breakingStory,
}: LocalPulseSectionProps) {
  const { language } = useLanguage();

  return (
    <section className="home-v31__section home-v31__enter atlas-pulse" aria-label="Local Pulse">
      <div className="atlas-pulse__heading">
        <p className="atlas-pulse__brand">
          {pickBilingualLabel(language, "Local Pulse", "स्थानीय सार")}
        </p>
        <span>{pickBilingualLabel(language, "Your local edition", "आपका स्थानीय संस्करण")}</span>
      </div>

      <DistrictQuickSwitch />

      {localAlerts.length > 0 ? (
        <LocalBreakingAlerts alerts={localAlerts} />
      ) : breakingStory ? (
        <aside className="local-strip" aria-label="Breaking news">
          <div className="nr-wrap">
            <strong className="local-strip__title">
              {pickBilingualLabel(language, "Breaking", "ब्रेकिंग")}
            </strong>
            <Link href={`/story/${breakingStory.slug}`} className="local-strip__row tap-target">
              <span className="local-strip__headline">{breakingStory.headline}</span>
            </Link>
          </div>
        </aside>
      ) : null}
    </section>
  );
}
