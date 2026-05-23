"use client";

import type { SubtitleCue } from "@/lib/news/shorts/types";
import { subtitleAtTime } from "@/lib/news/shorts/subtitles";

type ShortSubtitlesProps = {
  cues: SubtitleCue[];
  progressMs: number;
  className?: string;
  cinematic?: boolean;
};

export function ShortSubtitles({
  cues,
  progressMs,
  className = "",
  cinematic = false,
}: ShortSubtitlesProps) {
  const active = subtitleAtTime(cues, progressMs);
  if (!active) return null;

  return (
    <div
      className={`reel-caption${cinematic ? " reel-caption--cinematic" : ""} ${className}`.trim()}
      role="doc-subtitle"
      aria-live="polite"
    >
      <p className="reel-caption__text">{active.text}</p>
    </div>
  );
}
