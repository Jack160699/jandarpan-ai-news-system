"use client";

import { useLanguage } from "@/providers/LanguageProvider";

type StorySummaryBoxProps = {
  summary: string;
};

export function StorySummaryBox({ summary }: StorySummaryBoxProps) {
  const { t } = useLanguage();

  return (
    <aside
      className="immersive-summary story-summary-box"
      aria-labelledby="story-summary-title"
    >
      <div className="story-summary-box__head">
        <p id="story-summary-title" className="immersive-summary__label">
          {t.story.keyPoints}
        </p>
      </div>
      <p className="immersive-summary__text story-deck">{summary}</p>
    </aside>
  );
}
