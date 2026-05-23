"use client";

import type { SubtitleCue } from "@/lib/news/shorts/types";
import { subtitleAtTime } from "@/lib/news/shorts/subtitles";

type ShortSubtitlesProps = {
  cues: SubtitleCue[];
  progressMs: number;
  className?: string;
};

export function ShortSubtitles({
  cues,
  progressMs,
  className = "",
}: ShortSubtitlesProps) {
  const active = subtitleAtTime(cues, progressMs);
  if (!active) return null;

  return (
    <p
      className={`short-subtitles ${className}`.trim()}
      role="doc-subtitle"
      aria-live="polite"
    >
      {active.text}
    </p>
  );
}
