"use client";

import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/reader/LanguageSwitcher";
import { useTenant } from "@/providers/TenantProvider";
import type { AppLanguage } from "@/lib/i18n/types";
import { useLanguage } from "@/providers/LanguageProvider";

export function LanguageGate() {
  const { tenant } = useTenant();
  const { showLanguageGate, language, confirmLanguage, setLanguage, t, ready } =
    useLanguage();
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

  const brandName =
    language === "en" ? tenant.branding.nameEn : tenant.branding.nameHi;

  return (
    <div
      className={`language-gate ${visible ? "language-gate--visible" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-gate-title"
    >
      <div className="language-gate__panel">
        <p className="meta-label text-[var(--ink-faint)]">
          {brandName} · {t.gate.editionLabel}
        </p>
        <h2
          id="language-gate-title"
          className="headline-sm mt-3 text-[var(--ink-primary)]"
        >
          {t.gate.title}
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">{t.gate.subtitle}</p>
        <p className="editorial-body mt-3 text-[15px] text-[var(--ink-muted)]">
          {t.gate.description}
        </p>

        <LanguageSwitcher
          variant="grid"
          className="language-gate__options mt-4"
          value={selected}
          onSelect={setSelected}
        />

        <button
          type="button"
          className="language-gate__confirm tap-press mt-4"
          onClick={() => {
            confirmLanguage(selected);
            setLanguage(selected);
          }}
        >
          {t.gate.confirm}
        </button>
      </div>
    </div>
  );
}
