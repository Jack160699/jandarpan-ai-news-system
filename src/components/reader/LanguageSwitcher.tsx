"use client";

import { getLanguageConfig } from "@/lib/i18n/languages";
import type { AppLanguage } from "@/lib/i18n/types";
import { useLanguage } from "@/providers/LanguageProvider";

type LanguageSwitcherProps = {
  variant?: "compact" | "grid" | "list";
  className?: string;
  /** Gate mode — selection without immediate refresh */
  value?: AppLanguage;
  onSelect?: (lang: AppLanguage) => void;
};

export function LanguageSwitcher({
  variant = "list",
  className = "",
  value,
  onSelect,
}: LanguageSwitcherProps) {
  const { language, languageOptions, setLanguage } = useLanguage();
  const activeLang = value ?? language;

  const pick = (id: AppLanguage) => {
    if (onSelect) onSelect(id);
    else setLanguage(id);
  };

  if (variant === "grid") {
    return (
      <div className={`lang-switch lang-switch--grid ${className}`.trim()} role="listbox">
        {languageOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="option"
            aria-selected={activeLang === opt.id}
            className={`lang-switch__chip tap-press${activeLang === opt.id ? " is-active" : ""}`}
            onClick={() => pick(opt.id as AppLanguage)}
          >
            <span className="lang-switch__native">{opt.native}</span>
            <span className="lang-switch__label">{opt.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <ul className={`lang-switch lang-switch--${variant} ${className}`.trim()}>
      {languageOptions.map((opt) => {
        const cfg = getLanguageConfig(opt.id);
        const active = activeLang === opt.id;
        return (
          <li key={opt.id}>
            <button
              type="button"
              className={`lang-switch__item tap-press${active ? " is-active" : ""}`}
              aria-current={active ? "true" : undefined}
              onClick={() => pick(opt.id as AppLanguage)}
              style={{ fontFamily: cfg.fontFamily }}
            >
              <span className="lang-switch__native">{opt.native}</span>
              <span className="lang-switch__code">{opt.shortCode}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
