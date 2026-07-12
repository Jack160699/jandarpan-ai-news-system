"use client";

import { Moon } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { AUDIO_SLEEP_TIMER_PRESETS } from "../constants";
import { formatAudioTime } from "../utils";
import type { UseAudioV3Return } from "../hooks/useAudioV3";

export type SleepTimerProps = {
  audio: UseAudioV3Return;
  className?: string;
};

/**
 * JDP-016 — Sleep timer presets (placeholder countdown).
 */
export function SleepTimer({ audio, className }: SleepTimerProps) {
  const { sleepTimerMinutes, sleepRemainingSec, startSleepTimer, clearSleepTimer } = audio;

  return (
    <div className={cn("audio-v3-sleep", className)} aria-labelledby="audio-v3-sleep-label">
      <div className="audio-v3-sleep__header">
        <Moon size={16} aria-hidden />
        <span id="audio-v3-sleep-label" className="audio-v3-sleep__label">
          Sleep timer
        </span>
      </div>

      {sleepRemainingSec != null ? (
        <div className="audio-v3-sleep__active">
          <p className="audio-v3-sleep__remaining">
            Stops in <strong>{formatAudioTime(sleepRemainingSec)}</strong>
            {sleepTimerMinutes != null ? ` (${sleepTimerMinutes} min preset)` : null}
          </p>
          <button type="button" className="audio-v3-sleep__clear jds-focus-ring" onClick={clearSleepTimer}>
            Cancel timer
          </button>
        </div>
      ) : (
        <div className="audio-v3-sleep__presets" role="group" aria-label="Sleep timer presets">
          {AUDIO_SLEEP_TIMER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={cn("audio-v3-sleep__chip", "jds-focus-ring")}
              onClick={() => startSleepTimer(preset.minutes)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
