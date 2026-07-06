"use client";

import { useEffect, useRef } from "react";
import { SearchPanel } from "@/components/search/SearchPanel";
import { useLanguage } from "@/providers/LanguageProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useReaderPreferences();
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!searchOpen) return;

    triggerRef.current = document.activeElement as HTMLElement | null;
    const content = document.querySelector<HTMLElement>(".app-shell__content");
    contentRef.current = content;
    if (content) content.inert = true;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", trapFocus);
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 80);

    return () => {
      document.removeEventListener("keydown", trapFocus);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      if (contentRef.current) contentRef.current.inert = false;
      triggerRef.current?.focus?.();
    };
  }, [searchOpen, setSearchOpen]);

  if (!searchOpen) return null;

  return (
    <div
      className="search-overlay search-overlay--sheet"
      role="dialog"
      aria-modal="true"
      aria-label={t.search.title}
      onClick={() => setSearchOpen(false)}
    >
      <div
        ref={panelRef}
        className="search-overlay__panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-sheet__handle mb-3 md:hidden" aria-hidden />
        <p className="meta-label text-[var(--ink-faint)]">{t.search.title}</p>
        <SearchPanel compact autoFocus onNavigate={() => setSearchOpen(false)} />
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
