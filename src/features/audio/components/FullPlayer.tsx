"use client";

import { Headphones, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { cn } from "@/design-system/utils/cn";
import { AUDIO_PLACEHOLDER_NOTE } from "../constants";
import { formatAudioTime } from "../utils";
import type { UseAudioV3Return } from "../hooks/useAudioV3";

export type FullPlayerProps = {
  audio: UseAudioV3Return;
  variant?: "inline" | "sheet";
  className?: string;
};

/**
 * JDP-016 — Full-screen / hero audio player shell.
 */
export function FullPlayer({ audio, variant = "inline", className }: FullPlayerProps) {
  const {
    track,
    playing,
    currentTime,
    duration,
    progressPct,
    togglePlay,
    prev,
    next,
    index,
    tracks,
    seekTo,
    fullPlayerOpen,
    setFullPlayerOpen,
  } = audio;

  const isSheet = variant === "sheet";
  const visible = isSheet ? fullPlayerOpen : true;

  if (!visible || !track) return null;

  return (
    <section
      id="audio-v3-full-player"
      className={cn("audio-v3-full", isSheet && "audio-v3-full--sheet", className)}
      aria-labelledby="audio-v3-full-title"
      role="region"
    >
      <div className="audio-v3-full__header">
        <SectionHeader title="Listen" kicker="Audio Experience V3" />
        {isSheet && (
          <button
            type="button"
            className="audio-v3-full__close jds-focus-ring"
            onClick={() => setFullPlayerOpen(false)}
            aria-label="Close full player"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="audio-v3-full__hero" aria-hidden>
        <div className="audio-v3-full__art">
          <Headphones size={40} />
        </div>
      </div>

      <h2 id="audio-v3-full-title" className="audio-v3-full__headline" lang={track.language === "hi" ? "hi" : undefined}>
        {track.headline}
      </h2>
      <p className="audio-v3-full__meta">
        {track.categoryLabel}
        <span aria-hidden> · </span>
        Track {index + 1} of {tracks.length}
      </p>

      <div className="audio-v3-full__progress-wrap">
        <input
          type="range"
          className="audio-v3-full__seek jds-focus-ring"
          min={0}
          max={duration}
          step={1}
          value={currentTime}
          onChange={(e) => seekTo(Number(e.target.value))}
          aria-label="Seek playback position"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
        />
        <div className="audio-v3-full__progress" aria-hidden>
          <div className="audio-v3-full__progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="audio-v3-full__time">
        <span>{formatAudioTime(currentTime)}</span>
        <span>{formatAudioTime(duration)}</span>
      </div>

      <div className="audio-v3-full__controls">
        <button
          type="button"
          className="audio-v3-full__control jds-focus-ring"
          onClick={prev}
          disabled={index === 0}
          aria-label="Previous track"
        >
          <SkipBack size={22} />
        </button>
        <button
          type="button"
          className={cn("audio-v3-full__control", "audio-v3-full__control--primary", "jds-focus-ring")}
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause size={28} /> : <Play size={28} />}
        </button>
        <button
          type="button"
          className="audio-v3-full__control jds-focus-ring"
          onClick={next}
          disabled={index >= tracks.length - 1}
          aria-label="Next track"
        >
          <SkipForward size={22} />
        </button>
      </div>

      <p className="audio-v3-placeholder-note">{AUDIO_PLACEHOLDER_NOTE}</p>
    </section>
  );
}
