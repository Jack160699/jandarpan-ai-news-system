"use client";

import { History, Play } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { CONTINUE_LISTENING_PLACEHOLDER } from "../data/placeholders";
import { formatAudioTime, progressPercent } from "../utils";
import type { UseAudioV3Return } from "../hooks/useAudioV3";

export type ContinueListeningProps = {
  audio: UseAudioV3Return;
  className?: string;
};

/**
 * JDP-016 — Resume cards for in-progress listens (placeholder).
 */
export function ContinueListening({ audio, className }: ContinueListeningProps) {
  const { playTrackById } = audio;

  return (
    <section
      className={cn("audio-v3-continue", className)}
      aria-labelledby="audio-v3-continue-title"
    >
      <div className="audio-v3-continue__header">
        <History size={18} aria-hidden />
        <h3 id="audio-v3-continue-title" className="audio-v3-continue__title">
          Continue listening
        </h3>
      </div>

      <ul className="audio-v3-continue__list">
        {CONTINUE_LISTENING_PLACEHOLDER.map((item) => {
          const pct = progressPercent(item.progressSec, item.durationSec);
          return (
            <li key={item.id}>
              <article className="audio-v3-continue__card">
                <div className="audio-v3-continue__card-body">
                  <p className="audio-v3-continue__headline">{item.headline}</p>
                  <p className="audio-v3-continue__meta">
                    {item.categoryLabel}
                    <span aria-hidden> · </span>
                    {item.updatedAt}
                  </p>
                  <div className="audio-v3-continue__progress" aria-hidden>
                    <div className="audio-v3-continue__progress-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="audio-v3-continue__time">
                    {formatAudioTime(item.progressSec)} / {formatAudioTime(item.durationSec)}
                  </p>
                </div>
                <button
                  type="button"
                  className="audio-v3-continue__resume jds-focus-ring"
                  onClick={() => playTrackById(item.trackId)}
                  aria-label={`Resume ${item.headline}`}
                >
                  <Play size={18} />
                  Resume
                </button>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
