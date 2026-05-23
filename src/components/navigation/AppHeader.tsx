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
import { CategoryTabs } from "./CategoryTabs";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { IconMenu, IconMoon, IconSearch, IconSun } from "./NavIcons";

export function AppHeader() {
  const { tenant, headerLocation } = useTenant();
  const { language, setLanguage, t, languageOptions } = useLanguage();
  const { prefs, toggleTheme, setSearchOpen } = useReaderPreferences();
  const { menuOpen, setMenuOpen, openMenu, startNavigation } = useNavigation();
  const [langOpen, setLangOpen] = useState(false);
  const isMobile = useIsMobile();
  const showLocalizedBrand = language !== "en";
  const brandName = showLocalizedBrand
    ? tenant.branding.nameHi
    : tenant.branding.nameEn;

  const langShort =
    languageOptions.find((l) => l.id === language)?.shortCode ?? "हि";

  return (
    <>
      <header className="app-header" data-section="masthead">
        <div className="app-header__row">
          <Link
            href="/"
            className="app-header__brand tap-target"
            aria-label={brandName}
            onClick={() => startNavigation("/")}
          >
            <TenantLogo className="app-header__logo shrink-0" />
            {!isMobile ? (
              <div className="app-header__locale">
                <span className="app-header__city">
                  {showLocalizedBrand
                    ? headerLocation.cityHi
                    : headerLocation.city}
                </span>
                {headerLocation.condition ? (
                  <span className="app-header__weather">
                    {headerLocation.temp
                      ? `${headerLocation.temp} · `
                      : ""}
                    {headerLocation.condition}
                  </span>
                ) : null}
              </div>
            ) : null}
          </Link>

          <div className="app-header__actions">
            {isMobile ? (
              <>
                <Link
                  href="/live"
                  className="header-live-btn tap-target"
                  aria-label={t.nav.live}
                  onClick={() => startNavigation("/live")}
                >
                  <span className="header-live-btn__dot" aria-hidden />
                  LIVE
                </Link>

                <Link
                  href="/search"
                  className="header-icon-btn header-icon-btn--lg tap-target"
                  aria-label={t.header.search}
                  onClick={() => startNavigation("/search")}
                >
                  <IconSearch />
                </Link>

                <button
                  type="button"
                  className="header-icon-btn header-icon-btn--lg tap-target"
                  aria-label={t.nav.menu}
                  aria-expanded={menuOpen}
                  onClick={openMenu}
                >
                  <IconMenu />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="header-icon-btn tap-target"
                  aria-label={t.header.search}
                  onClick={() => setSearchOpen(true)}
                >
                  <IconSearch />
                </button>

                <div className="relative">
                  <button
                    type="button"
                    className="header-icon-btn tap-target header-icon-btn--lang"
                    aria-expanded={langOpen}
                    aria-haspopup="listbox"
                    aria-label={t.header.changeLanguage}
                    onClick={() => setLangOpen((o) => !o)}
                  >
                    {langShort}
                  </button>
                  {langOpen ? (
                    <div className="header-menu" role="listbox">
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
                  className="header-icon-btn tap-target"
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

        <CategoryTabs />
      </header>

      <MobileNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <SearchOverlay />
    </>
  );
}
