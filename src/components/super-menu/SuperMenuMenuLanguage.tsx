"use client";

import { Globe } from "lucide-react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { HeaderLanguageSwitcher } from "@/components/navigation/HeaderLanguageSwitcher";
import { SuperMenuPrefRow } from "./SuperMenuPrefRow";

/** Compact language row — value opens language picker */
export function SuperMenuMenuLanguage() {
  const { language } = useLanguage();

  return (
    <SuperMenuPrefRow
      icon={<Globe size={15} strokeWidth={2} />}
      label={pickBilingualLabel(language, "Language", "भाषा")}
      value={<HeaderLanguageSwitcher compact className="sm-menu-lang-switch" />}
    />
  );
}
