"use client";

import { Moon, Sun, Type } from "lucide-react";
import { EDITION_OPTIONS } from "@/lib/reader-preferences";
import { CG_DISTRICTS } from "@/lib/regional/districts";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { ProfileSection } from "./ProfileSection";

const FONT_SCALES = [
  { id: "sm" as const, labelEn: "Small", labelHi: "छोटा" },
  { id: "base" as const, labelEn: "Default", labelHi: "सामान्य" },
  { id: "lg" as const, labelEn: "Large", labelHi: "बड़ा" },
  { id: "xl" as const, labelEn: "Extra large", labelHi: "बहुत बड़ा" },
];

export function AppearanceSettingsSection() {
  const { language, t } = useLanguage();
  const {
    prefs,
    toggleTheme,
    toggleReadingMode,
    setEdition,
    setFontScale,
    setHomeDistrict,
  } = useReaderPreferences();
  const showHi = language !== "en";
  const activeDistrict = prefs.homeDistrict ?? "raipur";

  return (
    <ProfileSection
      id="appearance-settings"
      kicker={pickBilingualLabel(language, "Display", "दिखावट")}
      title={pickBilingualLabel(language, "Appearance settings", "दिखावट सेटिंग")}
      description={t.profile.appearanceHint}
      action={
        prefs.theme === "dark" ? (
          <Moon size={18} className="pv3-section-icon" aria-hidden />
        ) : (
          <Sun size={18} className="pv3-section-icon" aria-hidden />
        )
      }
    >
      <div className="pv3-settings">
        <div className="pv3-appearance-row">
          <div className="pv3-appearance-row__text">
            <span className="pv3-appearance-row__label">{t.nav.theme}</span>
            <span className="pv3-appearance-row__hint">{t.profile.appearanceHint}</span>
          </div>
          <button
            type="button"
            className="pv3-appearance-row__action"
            onClick={toggleTheme}
            aria-label={pickBilingualLabel(
              language,
              `Switch to ${prefs.theme === "light" ? "dark" : "light"} theme`,
              `${prefs.theme === "light" ? "डार्क" : "लाइट"} थीम पर बदलें`
            )}
          >
            {prefs.theme === "light"
              ? pickBilingualLabel(language, "Light", "लाइट")
              : pickBilingualLabel(language, "Dark", "डार्क")}
          </button>
        </div>

        <div className="pv3-appearance-row">
          <div className="pv3-appearance-row__text">
            <span className="pv3-appearance-row__label">
              {pickBilingualLabel(language, "Reading comfort", "पढ़ने की सुविधा")}
            </span>
            <span className="pv3-appearance-row__hint">
              {pickBilingualLabel(
                language,
                "Comfort mode adds spacing for longer reading sessions.",
                "आराम मोड लंबी पढ़ाई के लिए अतिरिक्त जगह देता है।"
              )}
            </span>
          </div>
          <button
            type="button"
            className="pv3-appearance-row__action"
            onClick={toggleReadingMode}
            aria-pressed={prefs.readingMode === "comfort"}
          >
            {prefs.readingMode === "comfort"
              ? pickBilingualLabel(language, "Comfort", "आराम")
              : pickBilingualLabel(language, "Standard", "सामान्य")}
          </button>
        </div>
      </div>

      <div className="pv3-appearance-group">
        <p className="pv3-appearance-group__title">
          <Type size={16} aria-hidden className="pv3-appearance-group__icon" />
          {pickBilingualLabel(language, "Text size", "टेक्स्ट आकार")}
        </p>
        <div className="pv3-segment" role="group" aria-label={pickBilingualLabel(language, "Text size", "टेक्स्ट आकार")}>
          {FONT_SCALES.map((scale) => (
            <button
              key={scale.id}
              type="button"
              className={`pv3-segment__btn${prefs.fontScale === scale.id ? " is-active" : ""}`}
              aria-pressed={prefs.fontScale === scale.id}
              onClick={() => setFontScale(scale.id)}
            >
              {showHi ? scale.labelHi : scale.labelEn}
            </button>
          ))}
        </div>
      </div>

      <div className="pv3-appearance-group">
        <p className="pv3-appearance-group__title">
          {pickBilingualLabel(language, "Edition", "संस्करण")}
        </p>
        <div className="pv3-segment" role="group" aria-label={pickBilingualLabel(language, "Edition", "संस्करण")}>
          {EDITION_OPTIONS.map((edition) => (
            <button
              key={edition.id}
              type="button"
              className={`pv3-segment__btn${prefs.edition === edition.id ? " is-active" : ""}`}
              aria-pressed={prefs.edition === edition.id}
              onClick={() => setEdition(edition.id)}
            >
              {showHi ? edition.hi : edition.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pv3-appearance-group">
        <p className="pv3-appearance-group__title">{t.profile.region}</p>
        <p className="pv3-appearance-group__hint">{t.profile.regionHint}</p>
        <div className="pv3-region-grid" role="group" aria-label={t.profile.region}>
          {CG_DISTRICTS.filter((d) => d.priority <= 2).map((district) => (
            <button
              key={district.slug}
              type="button"
              className={`pv3-region-btn${activeDistrict === district.slug ? " is-active" : ""}`}
              aria-pressed={activeDistrict === district.slug}
              onClick={() => setHomeDistrict(district.slug)}
            >
              {showHi ? district.nameHi : district.name}
            </button>
          ))}
        </div>
      </div>
    </ProfileSection>
  );
}
