"use client";

import Link from "next/link";
import { formatDuration } from "@/lib/listen/narrator";
import { useHeadlinesListenOptional } from "@/providers/HeadlinesListenProvider";

export function HeadlinesMiniPlayer() {
  const ctx = useHeadlinesListenOptional();
  if (!ctx?.hasPlaylist || !ctx.track) return null;

  const { track, playing, loading, togglePlay, next, currentTime, duration, index, tracks } =
    ctx;
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="hl-mini" role="region" aria-label="Now playing">
      <div className="hl-mini__progress" aria-hidden>
        <span style={{ width: `${progressPct}%` }} />
      </div>
      <div className="hl-mini__inner">
        <button
          type="button"
          className="hl-mini__play tap-target"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
        >
          {loading ? "…" : playing ? "❚❚" : "▶"}
        </button>
        <Link href="/listen" className="hl-mini__info tap-target">
          <p className="hl-mini__label">Now playing</p>
          <p className="hl-mini__title" lang={track.language === "hi" ? "hi" : undefined}>
            {track.headline}
          </p>
          <p className="hl-mini__time">
            {formatDuration(currentTime)} / {formatDuration(duration)} · {index + 1}/
            {tracks.length}
          </p>
        </Link>
        <button
          type="button"
          className="hl-mini__next tap-target"
          onClick={next}
          disabled={index >= tracks.length - 1}
          aria-label="Next headline"
        >
          ›
        </button>
      </div>
    </div>
  );
}
