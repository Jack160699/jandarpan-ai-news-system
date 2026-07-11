"use client";

import { ChevronUp, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { formatAudioTime } from "../utils";
import type { UseAudioV3Return } from "../hooks/useAudioV3";

export type MiniPlayerProps = {
  audio: UseAudioV3Return;
  className?: string;
};

/**
 * JDP-016 — Compact dock player for global chrome or page footer.
 */
export function MiniPlayer({ audio, className }: MiniPlayerProps) {
  const { track, playing, currentTime, duration, togglePlay, prev, next, index, tracks, setFullPlayerOpen } =
    audio;

  const scrollToFullPlayer = () => {
    setFullPlayerOpen(true);
    document.getElementById("audio-v3-full-player")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!track) return null;

  return (
    <div className={cn("audio-v3-mini", className)} role="region" aria-label="Mini audio player">
      <button
        type="button"
        className="audio-v3-mini__expand jds-focus-ring"
        onClick={scrollToFullPlayer}
        aria-label="Open full player"
      >
        <ChevronUp size={16} aria-hidden />
      </button>

      <div className="audio-v3-mini__meta">
        <p className="audio-v3-mini__title" lang={track.language === "hi" ? "hi" : undefined}>
          {track.headline}
        </p>
        <p className="audio-v3-mini__time">
          {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
        </p>
      </div>

      <div className="audio-v3-mini__controls">
        <button
          type="button"
          className="audio-v3-mini__control jds-focus-ring"
          onClick={prev}
          disabled={index === 0}
          aria-label="Previous track"
        >
          <SkipBack size={18} />
        </button>
        <button
          type="button"
          className={cn("audio-v3-mini__control", "audio-v3-mini__control--primary", "jds-focus-ring")}
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          type="button"
          className="audio-v3-mini__control jds-focus-ring"
          onClick={next}
          disabled={index >= tracks.length - 1}
          aria-label="Next track"
        >
          <SkipForward size={18} />
        </button>
      </div>
    </div>
  );
}
