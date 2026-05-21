"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import type { AppLanguage } from "@/lib/i18n/types";
import { useLanguage } from "@/providers/LanguageProvider";

export function LanguageGate() {
  const { showLanguageGate, language, confirmLanguage, t, ready } = useLanguage();
  const [selected, setSelected] = useState<AppLanguage>(language);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (showLanguageGate) {
      setSelected(language);
      document.body.style.overflow = "hidden";
      const id = requestAnimationFrame(() => setVisible(true));
      return () => {
        cancelAnimationFrame(id);
        document.body.style.overflow = "";
      };
    }
    setVisible(false);
    document.body.style.overflow = "";
  }, [showLanguageGate, language]);

  if (!ready || !showLanguageGate) return null;

  return (
    <div
      className={`language-gate ${visible ? "language-gate--visible" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-gate-title"
    >
      <div className="language-gate__panel">
        <p className="meta-label text-[var(--ink-faint)]">
          {BRAND.nameEn} · {t.gate.editionLabel}
        </p>
        <h2
          id="language-gate-title"
          className="headline-sm mt-3 text-[var(--ink-primary)]"
        >
          {t.gate.title}
        </h2>
        <p
          className="mt-2 text-sm text-[var(--ink-muted)]"
          style={{ fontFamily: "var(--font-hindi)" }}
        >
          {t.gate.subtitle}
        </p>
        <p className="editorial-body mt-3 text-[15px] text-[var(--ink-muted)]">
          {t.gate.description}
        </p>

        <div className="language-gate__options" role="listbox">
          {(["en", "hi", "cg"] as const).map((id) => {
            const opt = { en: "English", hi: "हिन्दी", cg: "छत्तीसगढ़ी" }[id];
            const label = { en: "English", hi: "Hindi", cg: "Chhattisgarhi" }[id];
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={selected === id}
                className="language-gate__option tap-target"
                onClick={() => setSelected(id)}
              >
                <span>
                  <span className="block text-base font-medium text-[var(--ink-primary)]">
                    {opt}
                  </span>
                  <span className="meta-label mt-1 text-[var(--ink-faint)]">
                    {label}
                  </span>
                </span>
                {selected === id ? (
                  <span className="meta-label text-[var(--accent-category)]">✓</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="language-gate__confirm tap-target"
          onClick={() => confirmLanguage(selected)}
        >
          {t.gate.confirm}
        </button>
      </div>
    </div>
  );
}
