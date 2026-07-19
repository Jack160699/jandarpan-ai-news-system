"use client";

import { Globe } from "lucide-react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { cn } from "@/lib/cn";
import { SuperMenuPrefRow } from "./SuperMenuPrefRow";

/** Language row — Hindi-first segmented toggle (हिन्दी | English) */
export function SuperMenuMenuLanguage() {
  const { language, setLanguage, languageOptions } = useLanguage();

  return (
    <SuperMenuPrefRow
      icon={<Globe size={15} strokeWidth={2} />}
      label={pickBilingualLabel(language, "Language", "भाषा")}
      value={
        <span
          className="sm-lang-toggle"
          role="radiogroup"
          aria-label={pickBilingualLabel(language, "Language", "भाषा")}
        >
          {languageOptions.map((opt) => {
            const active = language === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={cn(
                  "sm-lang-toggle__btn",
                  active && "sm-lang-toggle__btn--active"
                )}
                onClick={() => {
                  if (!active) setLanguage(opt.id);
                }}
              >
                {opt.native}
              </button>
            );
          })}
        </span>
      }
    />
  );
}
