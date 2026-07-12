"use client";

import { Skeleton } from "@/design-system/components/Skeleton";
import { useLanguage } from "@/providers/LanguageProvider";

export function SearchLoading() {
  const { t } = useLanguage();

  return (
    <div
      className="search-v3-loading"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <p className="search-v3-loading__label">{t.search.searching}</p>
      <div className="search-v3-loading__rows">
        {[1, 2, 3].map((i) => (
          <div key={i} className="search-v3-loading__row">
            <Skeleton className="search-v3-loading__thumb" variant="media" />
            <div className="search-v3-loading__text">
              <Skeleton className="search-v3-loading__line" />
              <Skeleton className="search-v3-loading__line search-v3-loading__line--short" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
