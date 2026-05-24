"use client";

import { pickDeskLabel } from "@/lib/i18n/pick-label";
import type { NewsDeskLabel } from "@/lib/newsroom/desk-branding";
import { useLanguage } from "@/providers/LanguageProvider";

type DeskBadgeProps = {
  desk: NewsDeskLabel;
  variant?: "editorial" | "wire" | "breaking";
};

export function DeskBadge({ desk, variant = "editorial" }: DeskBadgeProps) {
  const { language } = useLanguage();
  const name = pickDeskLabel(language, desk);

  return (
    <span className={`nr-desk nr-desk--${variant}`} title={name}>
      {name}
    </span>
  );
}
