"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";
import { LANGUAGE_OPTIONS, type ReaderLanguage } from "@/lib/reader-preferences";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

export function LanguageGate() {
  const { showLanguageGate, prefs, confirmLanguage } = useReaderPreferences();
  const [selected, setSelected] = useState<ReaderLanguage>(prefs.language);

  if (!showLanguageGate) return null;

  return (
    <div
      className="language-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-gate-title"
    >
      <div className="language-gate__panel">
        <p className="meta-label text-[var(--ink-faint)]">
          {BRAND.nameEn} · Concept Edition
        </p>
        <h2
          id="language-gate-title"
          className="headline-sm mt-3 text-[var(--ink-primary)]"
        >
          Choose your reading language
        </h2>
        <p
          className="mt-2 text-sm text-[var(--ink-muted)]"
          style={{ fontFamily: "var(--font-hindi)" }}
        >
          अपनी पढ़ाई की भाषा चुनें
        </p>
        <p className="editorial-body mt-3 text-[15px] text-[var(--ink-muted)]">
          The edition opens in the language you prefer. You may change this
          anytime from the masthead.
        </p>

        <div className="language-gate__options" role="listbox">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="option"
              aria-pressed={selected === opt.id}
              className="language-gate__option"
              onClick={() => setSelected(opt.id)}
            >
              <span>
                <span className="block text-[var(--ink-primary)] text-base font-medium">
                  {opt.native}
                </span>
                <span className="meta-label mt-1 text-[var(--ink-faint)]">
                  {opt.label}
                </span>
              </span>
              {selected === opt.id ? (
                <span className="meta-label text-[var(--brand-maroon)]">✓</span>
              ) : null}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="mt-6 w-full border border-[var(--brand-maroon-deep)] bg-[var(--brand-maroon-deep)] py-3.5 text-[var(--paper-elevated)] meta-label tracking-[0.2em] transition-opacity hover:opacity-90"
          onClick={() => confirmLanguage(selected)}
        >
          Open edition
        </button>
      </div>
    </div>
  );
}
