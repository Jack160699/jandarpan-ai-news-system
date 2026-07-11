"use client";

import { Skeleton } from "@/design-system/components/Skeleton";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * JDP-017 — Reels loading skeleton (mobile-first)
 */
export function ReelsLoading() {
  const { t } = useLanguage();

  return (
    <div
      className="reels-v3-loading"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <p className="reels-v3-loading__label">{t.shorts.loading}</p>
      <div className="reels-v3-loading__frame">
        <Skeleton className="reels-v3-loading__media" variant="media" />
        <div className="reels-v3-loading__actions" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="reels-v3-loading__action" />
          ))}
        </div>
        <div className="reels-v3-loading__content">
          <Skeleton className="reels-v3-loading__line reels-v3-loading__line--short" />
          <Skeleton className="reels-v3-loading__line" />
          <Skeleton className="reels-v3-loading__line reels-v3-loading__line--deck" />
        </div>
      </div>
    </div>
  );
}
