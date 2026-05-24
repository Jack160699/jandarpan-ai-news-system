"use client";

import Link from "next/link";
import { useState } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";
import type { AppLanguage } from "@/lib/i18n/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useTenant } from "@/providers/TenantProvider";
import { SearchOverlay } from "@/components/reader/SearchOverlay";
import { TenantLogo } from "@/components/tenant/TenantLogo";
import { IconMoon, IconSearch, IconSun } from "@/components/navigation/NavIcons";

export function MainHeader() {
  const { tenant, headerLocation } = useTenant();
  const { language, setLanguage, t, languageOptions } = useLanguage();
  const { prefs, toggleTheme, setSearchOpen } = useReaderPreferences();
  const { startNavigation } = useNavigation();
  const [langOpen, setLangOpen] = useState(false);
  const isMobile = useIsMobile();
  const brandName =
    language !== "en" ? tenant.branding.nameHi : tenant.branding.nameEn;
  const langShort =
    languageOptions.find((l) => l.id === language)?.shortCode ?? "हि";

  return (
    <>
      <header className="main-header app-header">
        <h1 className="sr-only">{brandName}</h1>
        <div className="main-header__inner">
          <Link
            href="/"
            className="main-header__brand"
            aria-label={brandName}
            onClick={() => startNavigation("/")}
          >
            <TenantLogo
              variant={isMobile ? "banner" : "mark"}
              showText={!isMobile}
            />
            {!isMobile ? (
              <div className="main-header__locale">
                <span className="main-header__city">
                  {language !== "en"
                    ? headerLocation.cityHi
                    : headerLocation.city}
                </span>
                {headerLocation.condition ? (
                  <span className="main-header__weather">
                    {headerLocation.temp
                      ? `${headerLocation.temp} · `
                      : ""}
                    {headerLocation.condition}
                  </span>
                ) : null}
              </div>
            ) : null}
          </Link>

          <div className="main-header__actions">
            {isMobile ? (
              <Link
                href="/search"
                className="main-header__btn"
                aria-label={t.header.search}
                onClick={() => startNavigation("/search")}
              >
                <IconSearch />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  className="main-header__btn"
                  aria-label={t.header.search}
                  onClick={() => setSearchOpen(true)}
                >
                  <IconSearch />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    className="main-header__btn"
                    aria-expanded={langOpen}
                    aria-haspopup="listbox"
                    aria-label={t.header.changeLanguage}
                    onClick={() => setLangOpen((o) => !o)}
                  >
                    {langShort}
                  </button>
                  {langOpen ? (
                    <div className="main-header__menu" role="listbox">
                      {languageOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          role="option"
                          aria-selected={language === opt.id}
                          onClick={() => {
                            setLanguage(opt.id as AppLanguage);
                            setLangOpen(false);
                          }}
                        >
                          {opt.native} · {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="main-header__btn"
                  aria-label={
                    prefs.theme === "light"
                      ? t.header.darkMode
                      : t.header.lightMode
                  }
                  onClick={toggleTheme}
                >
                  {prefs.theme === "light" ? <IconMoon /> : <IconSun />}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <SearchOverlay />
    </>
  );
}
