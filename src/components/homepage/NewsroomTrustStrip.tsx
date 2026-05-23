"use client";

import { useLanguage } from "@/providers/LanguageProvider";

export function NewsroomTrustStrip() {
  const { t } = useLanguage();

  return (
    <div className="nr-trust nr-wrap" role="note" aria-label="Editorial standards">
      <span className="nr-trust__item nr-trust__item--accent">
        <span className="nr-trust__check" aria-hidden>
          ✓
        </span>
        {t.trust.verified}
      </span>
      <span className="nr-trust__item">{t.trust.reviewed}</span>
      <span className="nr-trust__item">{t.trust.regionalNetwork}</span>
      <span className="nr-trust__item">{t.trust.fastUpdates}</span>
    </div>
  );
}
