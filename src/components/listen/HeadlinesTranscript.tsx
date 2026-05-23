"use client";

import { useMemo } from "react";
import { subtitleAtTime } from "@/lib/news/shorts/subtitles";
import type { SubtitleCue } from "@/lib/news/shorts/types";

type HeadlinesTranscriptProps = {
  transcript: string;
  subtitles: SubtitleCue[];
  progressMs: number;
};

export function HeadlinesTranscript({
  transcript,
  subtitles,
  progressMs,
}: HeadlinesTranscriptProps) {
  const activeCue = subtitleAtTime(subtitles, progressMs);

  const lines = useMemo(() => {
    if (subtitles.length > 0) {
      return subtitles.map((c) => c.text);
    }
    return transcript
      .split(/(?<=[.!?।])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [subtitles, transcript]);

  return (
    <div className="hl-transcript">
      <p className="hl-transcript__label">Transcript</p>
      {activeCue ? (
        <p className="hl-transcript__live" role="status" aria-live="polite">
          {activeCue.text}
        </p>
      ) : null}
      <div className="hl-transcript__body">
        {lines.map((line, i) => {
          const isActive = activeCue?.text === line;
          return (
            <p
              key={`${i}-${line.slice(0, 24)}`}
              className={`hl-transcript__line${isActive ? " hl-transcript__line--active" : ""}`}
            >
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}
