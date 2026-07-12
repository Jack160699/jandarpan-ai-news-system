"use client";

import { memo } from "react";
import { AtlasStoryTrustRow } from "./AtlasStoryTrustRow";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { StoryIntelligenceVm } from "@/lib/story/story-intelligence";

type AtlasStoryIntroProps = {
  headline: string;
  summary?: string | null;
  categoryLabel: string;
  author?: string | null;
  desk?: string | null;
  publishedAtLabel?: string | null;
  updatedAtLabel?: string | null;
  readTime: string;
  intelligence: Pick<
    StoryIntelligenceVm,
    "trust" | "attribution" | "reader" | "knowledge"
  >;
  language: NewsroomLanguage;
  isLive: boolean;
};

export const AtlasStoryIntro = memo(function AtlasStoryIntro({
  headline,
  summary,
  categoryLabel,
  author,
  desk,
  publishedAtLabel,
  updatedAtLabel,
  readTime,
  intelligence,
  language,
  isLive,
}: AtlasStoryIntroProps) {
  const authorLine = author?.trim() || desk?.trim() || null;

  return (
    <header className="atlas-story-intro">
      <p className="atlas-story-intro__category">{categoryLabel}</p>
      <h1 className="atlas-story-intro__headline">{headline}</h1>
      {summary?.trim() ? (
        <p className="atlas-story-intro__summary">{summary}</p>
      ) : null}

      <div className="atlas-story-intro__meta">
        {authorLine ? (
          <span className="atlas-story-intro__author">{authorLine}</span>
        ) : null}
        {publishedAtLabel ? (
          <time className="atlas-story-intro__time">{publishedAtLabel}</time>
        ) : null}
        {updatedAtLabel && updatedAtLabel !== publishedAtLabel ? (
          <span className="atlas-story-intro__updated">{updatedAtLabel}</span>
        ) : null}
      </div>

      <AtlasStoryTrustRow
        intelligence={intelligence}
        language={language}
        isLive={isLive}
        readTime={readTime}
      />
    </header>
  );
});
