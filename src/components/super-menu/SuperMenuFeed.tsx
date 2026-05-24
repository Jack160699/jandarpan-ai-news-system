"use client";

import Link from "next/link";
import { SlidersHorizontal, TrendingUp } from "lucide-react";
import {
  FEED_INTERESTS,
  labelForLink,
} from "@/lib/super-menu/config";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { SuperMenuSection } from "./SuperMenuSection";

type SuperMenuFeedProps = {
  onNavigate: (href: string) => void;
};

export function SuperMenuFeed({ onNavigate }: SuperMenuFeedProps) {
  const { language } = useLanguage();
  const { interests, toggleInterest } = useReaderAccount();

  return (
    <SuperMenuSection
      id="sm-feed"
      title={pickBilingualLabel(language, "Your Feed", "आपकी फ़ीड")}
      subtitle={pickBilingualLabel(
        language,
        "Personalized for you",
        "आपके लिए व्यक्तिगत"
      )}
      icon={<SlidersHorizontal size={16} strokeWidth={2} />}
      defaultOpen
    >
      <p className="sm-feed__hint">
        {pickBilingualLabel(
          language,
          "Tap topics to shape homepage, alerts & recommendations.",
          "होमपेज, अलर्ट और सुझावों के लिए विषय चुनें।"
        )}
      </p>
      <div className="sm-chip-grid" role="group" aria-label="Feed interests">
        {FEED_INTERESTS.map((item) => {
          const active = interests.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={`sm-chip tap-target${active ? " is-active" : ""}`}
              aria-pressed={active}
              onClick={() => toggleInterest(item.id)}
            >
              {labelForLink(item, language)}
            </button>
          );
        })}
      </div>
      <div className="sm-feed__actions">
        <Link
          href="/"
          className="sm-feed__cta tap-target"
          onClick={() => onNavigate("/")}
        >
          <TrendingUp size={16} strokeWidth={2} aria-hidden />
          {pickBilingualLabel(language, "Trending now", "अभी ट्रेंडिंग")}
        </Link>
        <Link
          href="/archive"
          className="sm-feed__cta sm-feed__cta--ghost tap-target"
          onClick={() => onNavigate("/archive")}
        >
          {pickBilingualLabel(language, "Customize Feed", "फ़ीड कस्टमाइज़")}
        </Link>
      </div>
    </SuperMenuSection>
  );
}
