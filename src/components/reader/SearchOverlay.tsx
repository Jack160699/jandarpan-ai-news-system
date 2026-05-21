"use client";

import { useEffect, useRef } from "react";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useReaderPreferences();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchOpen, setSearchOpen]);

  if (!searchOpen) return null;

  return (
    <div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Search edition"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="search-overlay__panel"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="meta-label text-[var(--ink-faint)]">Edition search</p>
        <input
          ref={inputRef}
          type="search"
          placeholder="Headlines, desks, filings…"
          aria-label="Search"
        />
        <p className="editorial-body mt-4 text-sm text-[var(--ink-muted)]">
          Concept build — search indexes sample filings only. Try &quot;Raipur&quot;,
          &quot;Bastar&quot;, or &quot;Investigation&quot;.
        </p>
        <button
          type="button"
          className="meta-label mt-6 text-[var(--ink-faint)] hover:text-[var(--brand-maroon)]"
          onClick={() => setSearchOpen(false)}
        >
          Close · Esc
        </button>
      </div>
    </div>
  );
}
