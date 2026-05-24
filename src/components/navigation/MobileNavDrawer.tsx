"use client";

import Link from "next/link";
import { useEffect } from "react";
import { NAV_CATEGORIES } from "@/lib/navigation";
import { resolveNavHref } from "@/lib/navigation/active";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { IconMoon, IconSun } from "./NavIcons";

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const { pathname, startNavigation } = useNavigation();
  const { t, language } = useLanguage();
  const { prefs, toggleTheme } = useReaderPreferences();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
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
      <aside className="nav-drawer" aria-label={t.nav.menu}>
        <div className="nav-drawer__head">
          <h2 className="nav-drawer__title">{t.nav.categoriesTitle}</h2>
          <button
            type="button"
            className="main-header__btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="nav-drawer__body">
          {NAV_CATEGORIES.map((cat) => {
            const href = resolveNavHref(cat.href, pathname);
            const label =
              language === "en" ? cat.label : (cat.labelHi ?? cat.label);
            return (
              <Link
                key={cat.id}
                href={href}
                className={`nav-drawer__link${cat.id === "live" ? " nav-drawer__link--live" : ""}`}
                onClick={() => {
                  startNavigation(href);
                  onClose();
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
        <div className="nav-drawer__foot">
          <Link href="/archive" className="nav-drawer__link" onClick={onClose}>
            {t.nav.savedStories}
          </Link>
          <Link href="/listen" className="nav-drawer__link" onClick={onClose}>
            {t.nav.listen}
          </Link>
          <button
            type="button"
            className="nav-drawer__theme"
            onClick={toggleTheme}
          >
            {prefs.theme === "light" ? <IconMoon /> : <IconSun />}
            <span>{t.nav.theme}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
