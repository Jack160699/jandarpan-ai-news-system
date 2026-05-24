"use client";

import Link from "next/link";
import type { AppLanguage } from "@/lib/i18n/types";
import { CG_DISTRICTS } from "@/lib/regional/districts";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { ThemeToggleButton } from "@/components/navigation/ThemeToggleButton";
import { IconBell, IconLive } from "@/components/navigation/NavIcons";

export function ProfileSettingsPanel() {
  const { language, setLanguage, t, languageOptions } = useLanguage();
  const { prefs, setHomeDistrict } = useReaderPreferences();
  const { startNavigation } = useNavigation();
  const showHi = language !== "en";
  const activeDistrict = prefs.homeDistrict ?? "raipur";

  return (
    <section className="profile-settings" aria-labelledby="profile-settings-heading">
      <h2 id="profile-settings-heading" className="profile-settings__heading">
        {t.profile.settings}
      </h2>

      <div className="profile-settings__group">
        <div className="profile-settings__row profile-settings__row--theme">
          <div className="profile-settings__row-text">
            <span className="profile-settings__label">{t.nav.theme}</span>
            <span className="profile-settings__hint">{t.profile.appearanceHint}</span>
          </div>
          <ThemeToggleButton compact />
        </div>
      </div>

      <div className="profile-settings__group">
        <p className="profile-settings__group-title">{t.header.changeLanguage}</p>
        <div className="profile-settings__lang-grid" role="listbox" aria-label={t.header.changeLanguage}>
          {languageOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-selected={language === opt.id}
              className={`profile-settings__lang-btn${language === opt.id ? " is-active" : ""}`}
              onClick={() => setLanguage(opt.id as AppLanguage)}
            >
              <span className="profile-settings__lang-native">{opt.native}</span>
              <span className="profile-settings__lang-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="profile-settings__group">
        <Link
          href="/live"
          className="profile-settings__link-row"
          onClick={() => startNavigation("/live")}
        >
          <span className="profile-settings__link-icon" aria-hidden>
            <IconBell />
          </span>
          <span className="profile-settings__link-body">
            <span className="profile-settings__label">{t.profile.notifications}</span>
            <span className="profile-settings__hint">{t.profile.notificationsHint}</span>
          </span>
          <span className="profile-settings__chevron" aria-hidden>
            ›
          </span>
        </Link>

        <Link
          href="/listen"
          className="profile-settings__link-row"
          onClick={() => startNavigation("/listen")}
        >
          <span className="profile-settings__link-icon" aria-hidden>
            <IconLive />
          </span>
          <span className="profile-settings__link-body">
            <span className="profile-settings__label">{t.nav.listen}</span>
            <span className="profile-settings__hint">{t.profile.listenHint}</span>
          </span>
          <span className="profile-settings__chevron" aria-hidden>
            ›
          </span>
        </Link>
      </div>

      <div className="profile-settings__group">
        <p className="profile-settings__group-title">{t.profile.region}</p>
        <p className="profile-settings__group-desc">{t.profile.regionHint}</p>
        <div className="profile-settings__region-grid">
          {CG_DISTRICTS.filter((d) => d.priority <= 2).map((district) => (
            <button
              key={district.slug}
              type="button"
              className={`profile-settings__region-btn${activeDistrict === district.slug ? " is-active" : ""}`}
              aria-pressed={activeDistrict === district.slug}
              onClick={() => setHomeDistrict(district.slug)}
            >
              {showHi ? district.nameHi : district.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
