"use client";

import { memo } from "react";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import type { ThreadTimelineEntry } from "../lib/build-thread-timeline";

type AtlasThreadProgressProps = {
  entries: ThreadTimelineEntry[];
  currentIndex: number;
  language: NewsroomLanguage;
};

export const AtlasThreadProgress = memo(function AtlasThreadProgress({
  entries,
  currentIndex,
  language,
}: AtlasThreadProgressProps) {
  if (entries.length < 2) return null;

  const beginning = entries[entries.length - 1];
  const latest = entries[0];
  const current =
    currentIndex >= 0 ? entries[currentIndex] : entries[Math.min(1, entries.length - 1)];

  const labels = {
    group: pickBilingualLabel(
      language,
      "Thread progress",
      "थ्रेड प्रगति"
    ),
    beginning: pickBilingualLabel(language, "Beginning", "शुरुआत"),
    current: pickBilingualLabel(language, "Current Update", "वर्तमान अपडेट"),
    latest: pickBilingualLabel(language, "Latest", "नवीनतम"),
  };

  return (
    <div
      className="atlas-thread-progress"
      role="group"
      aria-label={labels.group}
    >
      <div className="atlas-thread-progress__track" aria-hidden>
        <span className="atlas-thread-progress__line" />
      </div>
      <ol className="atlas-thread-progress__milestones">
        <li className="atlas-thread-progress__milestone">
          <span className="atlas-thread-progress__dot" aria-hidden />
          <span className="atlas-thread-progress__label">{labels.beginning}</span>
          <span className="sr-only">{beginning.headline}</span>
        </li>
        <li
          className="atlas-thread-progress__milestone atlas-thread-progress__milestone--current"
          aria-current="step"
        >
          <span className="atlas-thread-progress__dot" aria-hidden />
          <span className="atlas-thread-progress__label">{labels.current}</span>
          <span className="sr-only">{current.headline}</span>
        </li>
        <li className="atlas-thread-progress__milestone">
          <span className="atlas-thread-progress__dot" aria-hidden />
          <span className="atlas-thread-progress__label">{labels.latest}</span>
          <span className="sr-only">{latest.headline}</span>
        </li>
      </ol>
    </div>
  );
});
