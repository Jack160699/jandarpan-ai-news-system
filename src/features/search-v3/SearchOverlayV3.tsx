"use client";

import { useRef } from "react";
import { SearchExperienceV3 } from "./SearchExperienceV3";
import { useModalA11y } from "@/design-system/hooks/useModalA11y";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

/**
 * JDP-008 — Search overlay shell with focus trap and keyboard dismiss.
 */
export function SearchOverlayV3() {
  const { searchOpen, setSearchOpen } = useReaderPreferences();
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => setSearchOpen(false);

  useModalA11y({
    open: searchOpen,
    onClose: close,
    panelRef,
    inertSelector: ".app-shell__content, .jdp-shell__feed, .home-page",
    initialFocusSelector: "input[type='search']",
  });

  if (!searchOpen) return null;

  return (
    <div
      className="search-v3-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t.search.title}
    >
      <button
        type="button"
        className="search-v3-overlay__backdrop"
        aria-label={t.ribbon.dismiss}
        onClick={close}
      />
      <div ref={panelRef} className="search-v3-overlay__panel">
        <div className="search-v3-overlay__handle" aria-hidden />
        <p className="search-v3-overlay__label">{t.search.title}</p>
        <SearchExperienceV3 compact autoFocus onNavigate={close} />
        <button
          type="button"
          className="search-v3-overlay__dismiss tap-target"
          onClick={close}
        >
          {t.ribbon.dismiss}
        </button>
      </div>
    </div>
  );
}
