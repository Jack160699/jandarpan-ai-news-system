"use client";

import { Gauge } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { AUDIO_PLAYBACK_SPEEDS } from "../constants";
import type { UseAudioV3Return } from "../hooks/useAudioV3";

export type PlaybackSpeedProps = {
  audio: UseAudioV3Return;
  className?: string;
};

/**
 * JDP-016 — Playback speed selector (placeholder UI).
 */
export function PlaybackSpeed({ audio, className }: PlaybackSpeedProps) {
  const { speed, setSpeed } = audio;

  return (
    <div className={cn("audio-v3-speed", className)} role="group" aria-labelledby="audio-v3-speed-label">
      <div className="audio-v3-speed__header">
        <Gauge size={16} aria-hidden />
        <span id="audio-v3-speed-label" className="audio-v3-speed__label">
          Playback speed
        </span>
      </div>

      <div className="audio-v3-speed__options">
        {AUDIO_PLAYBACK_SPEEDS.map((option) => (
          <button
            key={option}
            type="button"
            className={cn(
              "audio-v3-speed__chip",
              "jds-focus-ring",
              speed === option && "audio-v3-speed__chip--active",
            )}
            onClick={() => setSpeed(option)}
            aria-pressed={speed === option}
          >
            {option}x
          </button>
        ))}
      </div>
    </div>
  );
}
