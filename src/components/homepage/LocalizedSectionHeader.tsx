"use client";

import { useLanguage } from "@/providers/LanguageProvider";

type LocalizedSectionHeaderProps = {
  id: string;
  title: string;
  href?: string;
  hrefLabel?: string;
};

export function LocalizedSectionHeader({
  id,
  title,
  href,
  hrefLabel,
}: LocalizedSectionHeaderProps) {
  const { t } = useLanguage();
  const more = hrefLabel ?? t.common.seeAll;

  return (
    <header className="nr-section__header nr-section__header--daily">
      <div className="nr-section__header-row">
        <h2 id={id} className="nr-section__title">
          {title}
        </h2>
        {href ? (
          <a href={href} className="nr-section__more tap-target">
            {more}
          </a>
        ) : null}
      </div>
    </header>
  );
}
