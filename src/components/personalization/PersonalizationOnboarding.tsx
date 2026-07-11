"use client";

import { useState } from "react";
import { FEED_INTERESTS } from "@/lib/personalization/interests";
import { labelForLink } from "@/lib/super-menu/config";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useHomepageLayout } from "@/hooks/useHomepageLayout";
import { resetHomepageLayout } from "@/lib/personalization/homepage-layout";

export function PersonalizationOnboarding() {
  const { language } = useLanguage();
  const { interests, setInterests } = useReaderAccount();
  const { layout, persist } = useHomepageLayout();
  const [dismissed, setDismissed] = useState(false);

  if (layout.onboardingDone || dismissed) return null;

  const finish = (selected: string[]) => {
    setInterests(selected);
    persist({ ...layout, onboardingDone: true });
  };

  return (
    <section
      className="hp-onboarding"
      aria-labelledby="hp-onboarding-title"
    >
      <div className="hp-onboarding__card">
        <header className="hp-onboarding__head">
          <p className="hp-onboarding__kicker">
            {pickBilingualLabel(language, "Personalize", "व्यक्तिगत")}
          </p>
          <h2 id="hp-onboarding-title" className="hp-onboarding__title">
            {pickBilingualLabel(
              language,
              "What do you want to read?",
              "आप क्या पढ़ना चाहते हैं?"
            )}
          </h2>
          <p className="hp-onboarding__subtitle">
            {pickBilingualLabel(
              language,
              "Pick a few topics — we'll shape your homepage.",
              "कुछ विषय चुनें — हम आपका होमपेज बनाएंगे।"
            )}
          </p>
        </header>
        <div className="hp-onboarding__chips" role="group">
          {FEED_INTERESTS.map((item) => {
            const active = interests.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`hp-onboarding__chip tap-target${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => {
                  const next = active
                    ? interests.filter((x) => x !== item.id)
                    : [...interests, item.id];
                  setInterests(next);
                }}
              >
                {labelForLink(item, language)}
              </button>
            );
          })}
        </div>
        <div className="hp-onboarding__actions">
          <button
            type="button"
            className="hp-onboarding__primary tap-target"
            onClick={() => finish(interests)}
          >
            {pickBilingualLabel(language, "Continue", "जारी रखें")}
          </button>
          <button
            type="button"
            className="hp-onboarding__ghost tap-target"
            onClick={() => {
              setDismissed(true);
              persist(resetHomepageLayout());
            }}
          >
            {pickBilingualLabel(language, "Skip for now", "अभी छोड़ें")}
          </button>
        </div>
      </div>
    </section>
  );
}
