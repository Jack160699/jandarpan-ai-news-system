"use client";

import { Languages } from "lucide-react";
import type { AppLanguage } from "@/lib/i18n/types";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { ProfileSection } from "./ProfileSection";

export function LanguageSettingsSection() {
  const { language, setLanguage, t, languageOptions } = useLanguage();

  return (
    <ProfileSection
      id="language-settings"
      kicker={pickBilingualLabel(language, "Locale", "भाषा")}
      title={pickBilingualLabel(language, "Language settings", "भाषा सेटिंग")}
      description={t.header.changeLanguage}
      action={<Languages size={18} className="pv3-section-icon" aria-hidden />}
    >
      <div
        className="pv3-lang-grid"
        role="listbox"
        aria-label={t.header.changeLanguage}
      >
        {languageOptions.map((opt) => {
          const active = language === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={active}
              className={`pv3-lang-btn${active ? " is-active" : ""}`}
              onClick={() => setLanguage(opt.id as AppLanguage)}
            >
              <span className="pv3-lang-btn__native">{opt.native}</span>
              <span className="pv3-lang-btn__label">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </ProfileSection>
  );
}
