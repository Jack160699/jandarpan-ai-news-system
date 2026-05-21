"use client";

import { SectionLabel } from "@/components/ui/SectionLabel";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { useLanguage } from "@/providers/LanguageProvider";

const TICKER_MORNING =
  "नया रायपुर: फाइल गायब · Raipur civic update at 10 AM · Durg school inspection postponed · Bastar health camp route extended · Assembly item nine deferred ·";

const TICKER_EVENING =
  "Evening filing: Naya Raipur register restored online · Bhilai night shift notice · Youth league final replay at 8 · Water ward charts updated ·";

export function BreakingNews() {
  const { t } = useLanguage();
  const ctx = useEditorialIntelligenceOptional();
  const ticker =
    ctx?.live.phase === "evening" || ctx?.live.phase === "night"
      ? TICKER_EVENING
      : TICKER_MORNING;

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
          {t.common.breaking} · {t.common.breakingLabel}
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
