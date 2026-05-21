"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { BRAND } from "@/lib/brand";
import { HEADER_LOCATION } from "@/lib/navigation";
import type { AppLanguage } from "@/lib/i18n/types";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { SearchOverlay } from "@/components/reader/SearchOverlay";
import { CategoryTabs } from "./CategoryTabs";
import { MobileSheet } from "./MobileSheet";
import { IconMoon, IconSearch, IconSun } from "./NavIcons";

export function AppHeader() {
  const { language, setLanguage, t, languageOptions } = useLanguage();
  const { prefs, toggleTheme, setSearchOpen } = useReaderPreferences();
  const [langOpen, setLangOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const showLocalizedBrand = language !== "en";

  const langShort =
    languageOptions.find((l) => l.id === language)?.native.slice(0, 2) ?? "हि";

  useEffect(() => {
    if (!langOpen || isMobile) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [langOpen, isMobile]);

  return (
    <>
      <header className="app-header" data-section="masthead">
        <div className="app-header__row">
          <div className="app-header__brand">
            <Link href="/" className="app-header__logo shrink-0">
              {showLocalizedBrand ? BRAND.nameHi : BRAND.nameEn}
            </Link>
            <div className="app-header__locale hidden min-[380px]:flex">
              <span className="app-header__city">
                {showLocalizedBrand
                  ? HEADER_LOCATION.cityHi
                  : HEADER_LOCATION.city}
              </span>
              <span className="app-header__weather">
                {HEADER_LOCATION.temp} · {HEADER_LOCATION.condition}
              </span>
            </div>
          </div>

          <div className="app-header__actions">
            <button
              type="button"
              className="header-icon-btn tap-target min-[380px]:hidden"
              aria-label={`${HEADER_LOCATION.city}, ${HEADER_LOCATION.temp}`}
              title={`${HEADER_LOCATION.city} · ${HEADER_LOCATION.temp}`}
            >
              <span className="text-[10px] font-medium leading-none">
                {HEADER_LOCATION.temp}
              </span>
            </button>

            <button
              type="button"
              className="header-icon-btn tap-target"
              aria-label={t.header.search}
              onClick={() => setSearchOpen(true)}
            >
              <IconSearch />
            </button>

            <div ref={menuRef} className="relative">
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
              {langOpen && !isMobile ? (
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
          </div>
        </div>

        <CategoryTabs />
      </header>

      <MobileSheet
        open={langOpen && isMobile}
        onClose={() => setLangOpen(false)}
        title={t.header.languageSheetTitle}
      >
        {languageOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className="mobile-sheet__option tap-target"
            role="option"
            aria-selected={language === opt.id}
            onClick={() => {
              setLanguage(opt.id as AppLanguage);
              setLangOpen(false);
            }}
          >
            <span>
              <span className="mobile-sheet__option-hi block">{opt.native}</span>
              <span className="text-sm text-[var(--ink-muted)]">{opt.label}</span>
            </span>
            {language === opt.id ? (
              <span className="text-[var(--brand-maroon)]">✓</span>
            ) : null}
          </button>
        ))}
      </MobileSheet>

      <SearchOverlay />
    </>
  );
}
