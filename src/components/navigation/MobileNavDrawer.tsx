"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { AppLanguage } from "@/lib/i18n/types";
import { NAV_CATEGORIES } from "@/lib/navigation";
import { resolveNavHref } from "@/lib/navigation/active";
import { getPrioritizedDistricts } from "@/lib/regional/districts";
import { useNavigation } from "@/providers/NavigationProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { useTenant } from "@/providers/TenantProvider";
import { IconMoon, IconSun } from "./NavIcons";

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

const NAV_KEYS: Record<string, keyof ReturnType<typeof useLanguage>["t"]["nav"]> = {
  "top-news": "topNews",
  chhattisgarh: "chhattisgarh",
  raipur: "raipur",
  politics: "politics",
  crime: "crime",
  sports: "sports",
  business: "business",
  education: "education",
};

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const { t, language, setLanguage, languageOptions } = useLanguage();
  const { prefs, toggleTheme } = useReaderPreferences();
  const { pathname, startNavigation } = useNavigation();
  const { navCategories } = useTenant();
  const districts = getPrioritizedDistricts().slice(0, 12);
  const categories = navCategories.length ? navCategories : NAV_CATEGORIES;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="nav-drawer__backdrop"
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside
        className="nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nav-drawer-title"
      >
        <header className="nav-drawer__head">
          <h2 id="nav-drawer-title" className="nav-drawer__title">
            {t.nav.menu}
          </h2>
          <button
            type="button"
            className="nav-drawer__close tap-target"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="nav-drawer__body">
          <section className="nav-drawer__section">
            <h3 className="nav-drawer__section-title">{t.nav.districtsTitle}</h3>
            <ul className="nav-drawer__chips">
              {districts.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/district/${d.slug}`}
                    className="nav-drawer__chip tap-target"
                    onClick={() => {
                      startNavigation(`/district/${d.slug}`);
                      onClose();
                    }}
                  >
                    <span className="nav-drawer__chip-hi">{d.nameHi}</span>
                    <span className="nav-drawer__chip-en">{d.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="nav-drawer__section">
            <h3 className="nav-drawer__section-title">
              {t.nav.categoriesTitle}
            </h3>
            <ul className="nav-drawer__list">
              {categories.map((cat) => {
                const key = NAV_KEYS[cat.id];
                const label = key
                  ? t.nav[key]
                  : language === "en"
                    ? cat.label
                    : cat.labelHi ?? cat.label;
                return (
                  <li key={cat.id}>
                    <Link
                      href={resolveNavHref(cat.href, pathname)}
                      className="nav-drawer__link tap-target"
                      onClick={() => {
                        startNavigation(resolveNavHref(cat.href, pathname));
                        onClose();
                      }}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="nav-drawer__section">
            <h3 className="nav-drawer__section-title">{t.header.changeLanguage}</h3>
            <div className="nav-drawer__lang-grid">
              {languageOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`nav-drawer__lang-btn tap-target${language === opt.id ? " is-active" : ""}`}
                  aria-pressed={language === opt.id}
                  onClick={() => setLanguage(opt.id as AppLanguage)}
                >
                  {opt.native}
                </button>
              ))}
            </div>
          </section>

          <section className="nav-drawer__section nav-drawer__section--actions">
            <Link
              href="/archive"
              className="nav-drawer__action tap-target"
              onClick={() => {
                startNavigation("/archive");
                onClose();
              }}
            >
              <span>{t.nav.savedStories}</span>
              <span aria-hidden>→</span>
            </Link>
            <button
              type="button"
              className="nav-drawer__action tap-target"
              onClick={toggleTheme}
            >
              <span>{t.nav.theme}</span>
              <span className="nav-drawer__theme-icon" aria-hidden>
                {prefs.theme === "light" ? <IconMoon /> : <IconSun />}
              </span>
            </button>
          </section>
        </div>
      </aside>
    </>
  );
}
