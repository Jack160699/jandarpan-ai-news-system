"use client";

import { BRAND } from "@/lib/brand";
import { useLanguage } from "@/providers/LanguageProvider";

export function ConceptBanner() {
  const { t } = useLanguage();

  return (
    <div className="concept-banner" role="note">
      <p className="concept-banner__text">{t.brand.conceptNote}</p>
    </div>
  );
}
