"use client";

import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { SearchPanel } from "@/components/search/SearchPanel";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useReaderPreferences();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!searchOpen) return;
    const prev = isMobile ? document.body.style.overflow : "";
    if (isMobile) document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (isMobile) document.body.style.overflow = prev;
    };
  }, [searchOpen, setSearchOpen, isMobile]);

  if (!searchOpen) return null;

  return (
    <div
      className={`search-overlay ${isMobile ? "search-overlay--sheet" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={t.search.title}
      onClick={() => setSearchOpen(false)}
    >
      <div
        ref={inputRef}
        className="search-overlay__panel"
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile ? <div className="mobile-sheet__handle mb-3" aria-hidden /> : null}
        <p className="meta-label text-[var(--ink-faint)]">{t.search.title}</p>
        <SearchPanel compact onNavigate={() => setSearchOpen(false)} />
        <button
          type="button"
          className="meta-label mt-5 min-h-[44px] text-[var(--ink-faint)] tap-target"
          onClick={() => setSearchOpen(false)}
        >
          {t.ribbon.dismiss}
        </button>
      </div>
    </div>
  );
}
