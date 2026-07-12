"use client";

import { MapPin } from "lucide-react";
import { DistrictQuickSwitch } from "@/components/personalization/DistrictQuickSwitch";
import { LocalBreakingAlerts } from "@/components/homepage/LocalBreakingAlerts";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";

type LocalPulseSectionProps = {
  districtName: string;
  districtNameHi: string;
  localAlerts: GeneratedHomepageFeed["localBreakingAlerts"];
};

export function LocalPulseSection({
  districtName,
  districtNameHi,
  localAlerts,
}: LocalPulseSectionProps) {
  const { language } = useLanguage();
  const districtLabel = pickBilingualLabel(language, districtName, districtNameHi);
  const dateLabel = new Date().toLocaleDateString(
    language === "hi" ? "hi-IN" : "en-IN",
    { weekday: "short", month: "short", day: "numeric" }
  );

  return (
    <section className="home-v31__section home-v31__enter atlas-pulse" aria-label="Local Pulse">
      <p className="atlas-pulse__brand">
        {pickBilingualLabel(language, "Local Pulse", "स्थानीय सार")}
      </p>

      <div className="atlas-pulse__row">
        <p className="atlas-pulse__place">
          <MapPin size={16} aria-hidden className="atlas-pulse__place-icon" />
          {districtLabel}
        </p>
        <time className="atlas-pulse__date" dateTime={new Date().toISOString().slice(0, 10)}>
          {dateLabel}
        </time>
      </div>

      {localAlerts.length > 0 ? (
        <LocalBreakingAlerts alerts={localAlerts} />
      ) : null}

      <DistrictQuickSwitch />
    </section>
  );
}
