"use client";

import { useEffect, useRef, useState } from "react";
import {
  EDITION_OPTIONS,
  LANGUAGE_OPTIONS,
  type EditionChoice,
  type ReaderLanguage,
} from "@/lib/reader-preferences";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { SearchOverlay } from "./SearchOverlay";

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

type DropdownProps = {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function UtilityDropdown({ label, open, onToggle, children }: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="utility-btn"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={onToggle}
      >
        {label}
      </button>
      {open ? <div className="utility-dropdown">{children}</div> : null}
    </div>
  );
}

export function MastheadControls() {
  const {
    prefs,
    setLanguage,
    toggleTheme,
    toggleReadingMode,
    setEdition,
    setSearchOpen,
  } = useReaderPreferences();

  const [langOpen, setLangOpen] = useState(false);
  const [editionOpen, setEditionOpen] = useState(false);

  const langLabel =
    LANGUAGE_OPTIONS.find((l) => l.id === prefs.language)?.native.slice(0, 2) ??
    "हि";
  const editionLabel =
    EDITION_OPTIONS.find((e) => e.id === prefs.edition)?.label.slice(0, 3) ??
    "Mor";

  return (
    <>
      <div className="masthead-utilities">
        <div className="editorial-container masthead-utilities__inner">
          <div className="masthead-utilities__group">
            <UtilityDropdown
              label={langLabel}
              open={langOpen}
              onToggle={() => {
                setLangOpen((o) => !o);
                setEditionOpen(false);
              }}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={prefs.language === opt.id}
                  onClick={() => {
                    setLanguage(opt.id as ReaderLanguage);
                    setLangOpen(false);
                  }}
                >
                  {opt.native} · {opt.label}
                </button>
              ))}
            </UtilityDropdown>

            <UtilityDropdown
              label={editionLabel}
              open={editionOpen}
              onToggle={() => {
                setEditionOpen((o) => !o);
                setLangOpen(false);
              }}
            >
              {EDITION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={prefs.edition === opt.id}
                  onClick={() => {
                    setEdition(opt.id as EditionChoice);
                    setEditionOpen(false);
                  }}
                >
                  {opt.label} · {opt.hi}
                </button>
              ))}
            </UtilityDropdown>
          </div>

          <div className="masthead-utilities__group">
            <button
              type="button"
              className="utility-btn"
              aria-label={
                prefs.readingMode === "comfort"
                  ? "Standard reading mode"
                  : "Comfort reading mode"
              }
              aria-pressed={prefs.readingMode === "comfort"}
              onClick={toggleReadingMode}
              title="Reading mode"
            >
              <IconBook />
            </button>
            <button
              type="button"
              className="utility-btn"
              aria-label={prefs.theme === "light" ? "Dark mode" : "Light mode"}
              onClick={toggleTheme}
            >
              {prefs.theme === "light" ? <IconMoon /> : <IconSun />}
            </button>
            <button
              type="button"
              className="utility-btn"
              aria-label="Search edition"
              onClick={() => setSearchOpen(true)}
            >
              <IconSearch />
            </button>
          </div>
        </div>
      </div>
      <SearchOverlay />
    </>
  );
}
