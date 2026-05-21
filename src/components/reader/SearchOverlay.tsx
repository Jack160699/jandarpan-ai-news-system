"use client";

import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useReaderPreferences();
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!searchOpen) return;
    inputRef.current?.focus();
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
      aria-label="Search edition"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="search-overlay__panel"
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile ? <div className="mobile-sheet__handle mb-3" aria-hidden /> : null}
        <p className="meta-label text-[var(--ink-faint)]">खोजें · Search</p>
        <input
          ref={inputRef}
          type="search"
          placeholder="Headlines, Raipur, Bastar…"
          aria-label="Search"
          className="mt-2"
        />
        <p className="editorial-body mt-3 text-sm text-[var(--ink-muted)]">
          Try &quot;Raipur&quot;, &quot;Politics&quot;, or &quot;Investigation&quot;.
        </p>
        <button
          type="button"
          className="meta-label mt-5 min-h-[44px] text-[var(--ink-faint)]"
          onClick={() => setSearchOpen(false)}
        >
          बंद करें · Close
        </button>
      </div>
    </div>
  );
}
