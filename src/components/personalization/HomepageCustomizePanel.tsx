"use client";

import { useState } from "react";
import {
  DEFAULT_HOMEPAGE_ORDER,
  moveModule,
  resetHomepageLayout,
  toggleModulePin,
  toggleModuleVisibility,
} from "@/lib/personalization/homepage-layout";
import type { HomepageModuleId } from "@/lib/personalization/types";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useHomepageLayout } from "@/hooks/useHomepageLayout";

const MODULE_LABELS: Record<
  HomepageModuleId,
  { en: string; hi: string }
> = {
  "highlights-desk": { en: "District & global desk", hi: "जिला और वैश्विक डेस्क" },
  recommended: { en: "Recommended for you", hi: "आपके लिए सुझाव" },
  shorts: { en: "News shorts", hi: "न्यूज़ शॉर्ट्स" },
  trending: { en: "Trending", hi: "ट्रेंडिंग" },
  hyperlocal: { en: "Hyperlocal", hi: "हाइपरलोकल" },
};

export function HomepageCustomizePanel() {
  const { language } = useLanguage();
  const { layout, persist } = useHomepageLayout();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="hp-customize-trigger tap-target"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {pickBilingualLabel(language, "Customize homepage", "होमपेज कस्टमाइज़")}
      </button>
    );
  }

  return (
    <div
      className="hp-customize"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hp-customize-title"
    >
      <div className="hp-customize__sheet">
        <header className="hp-customize__head">
          <h2 id="hp-customize-title" className="hp-customize__title">
            {pickBilingualLabel(language, "Your homepage", "आपका होमपेज")}
          </h2>
          <button
            type="button"
            className="hp-customize__close tap-target"
            onClick={() => setOpen(false)}
            aria-label={pickBilingualLabel(language, "Close", "बंद करें")}
          >
            ×
          </button>
        </header>
        <ul className="hp-customize__list" role="list">
          {DEFAULT_HOMEPAGE_ORDER.map((id) => {
            const labels = MODULE_LABELS[id];
            const hidden = layout.hidden.includes(id);
            const pinned = layout.pinned.includes(id);
            return (
              <li key={id} className="hp-customize__row">
                <span className="hp-customize__name">
                  {pickBilingualLabel(language, labels.en, labels.hi)}
                </span>
                <div className="hp-customize__controls">
                  <button
                    type="button"
                    className="hp-customize__btn tap-target"
                    aria-pressed={!hidden}
                    onClick={() => persist(toggleModuleVisibility(layout, id))}
                  >
                    {hidden
                      ? pickBilingualLabel(language, "Show", "दिखाएँ")
                      : pickBilingualLabel(language, "Hide", "छुपाएँ")}
                  </button>
                  <button
                    type="button"
                    className={`hp-customize__btn tap-target${pinned ? " is-active" : ""}`}
                    aria-pressed={pinned}
                    onClick={() => persist(toggleModulePin(layout, id))}
                  >
                    {pickBilingualLabel(language, "Pin", "पिन")}
                  </button>
                  <button
                    type="button"
                    className="hp-customize__btn tap-target"
                    onClick={() => persist(moveModule(layout, id, "up"))}
                    aria-label={pickBilingualLabel(language, "Move up", "ऊपर")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="hp-customize__btn tap-target"
                    onClick={() => persist(moveModule(layout, id, "down"))}
                    aria-label={pickBilingualLabel(language, "Move down", "नीचे")}
                  >
                    ↓
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="hp-customize__reset tap-target"
          onClick={() => persist(resetHomepageLayout())}
        >
          {pickBilingualLabel(language, "Reset homepage", "होमपेज रीसेट")}
        </button>
      </div>
    </div>
  );
}
