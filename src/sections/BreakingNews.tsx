"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { useLanguage } from "@/providers/LanguageProvider";

type BreakingNewsProps = {
  /** Live headlines from ingestion (no static demo ticker) */
  headlines?: string[];
};

export function BreakingNews({ headlines = [] }: BreakingNewsProps) {
  const { t } = useLanguage();

  const ticker =
    headlines.length > 0
      ? headlines.join(" · ") + " · "
      : `${t.common.breakingLabel} — Chhattisgarh live wire updating… · `;

  return (
    <section
      id="breaking"
      className="news-scroll-target relative z-10 border-b border-[var(--rule)] bg-[var(--accent-orange)] text-white"
      aria-label={t.common.breaking}
    >
      <div className="editorial-container flex items-stretch gap-3 py-2 md:py-2.5">
        <SectionLabel
          variant="breaking"
          className="shrink-0 self-center !text-white"
        >
          {t.common.breaking} · LIVE
        </SectionLabel>
        <div className="breaking-ticker relative flex-1 overflow-hidden">
          <div className="breaking-ticker__track flex w-max gap-10 whitespace-nowrap md:gap-14">
            <span className="breaking-ticker__text">{ticker}</span>
            <span className="breaking-ticker__text" aria-hidden>
              {ticker}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
