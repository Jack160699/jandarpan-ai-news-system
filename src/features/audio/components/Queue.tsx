"use client";

import { ListMusic } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { formatAudioTime } from "../utils";
import type { UseAudioV3Return } from "../hooks/useAudioV3";

export type QueueProps = {
  audio: UseAudioV3Return;
  className?: string;
};

/**
 * JDP-016 — Upcoming tracks queue with play-now actions.
 */
export function Queue({ audio, className }: QueueProps) {
  const { tracks, index, playTrackAt } = audio;

  return (
    <section className={cn("audio-v3-queue", className)} aria-labelledby="audio-v3-queue-title">
      <div className="audio-v3-queue__header">
        <ListMusic size={18} aria-hidden />
        <h3 id="audio-v3-queue-title" className="audio-v3-queue__title">
          Queue
        </h3>
        <span className="audio-v3-queue__count">{tracks.length} tracks</span>
      </div>

      <ol className="audio-v3-queue__list">
        {tracks.map((item, i) => {
          const isActive = i === index;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  "audio-v3-queue__item",
                  "jds-focus-ring",
                  isActive && "audio-v3-queue__item--active",
                )}
                onClick={() => playTrackAt(i)}
                aria-current={isActive ? "true" : undefined}
              >
                <span className="audio-v3-queue__num">{String(i + 1).padStart(2, "0")}</span>
                <span className="audio-v3-queue__body">
                  <span
                    className="audio-v3-queue__headline"
                    lang={item.language === "hi" ? "hi" : undefined}
                  >
                    {item.headline}
                  </span>
                  <span className="audio-v3-queue__meta">
                    {item.categoryLabel}
                    <span aria-hidden> · </span>
                    {formatAudioTime(item.durationSec)}
                  </span>
                </span>
                {isActive && <span className="audio-v3-queue__badge">Now playing</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
