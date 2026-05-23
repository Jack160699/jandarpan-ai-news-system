"use client";

import Link from "next/link";
import { HeadlinesTranscript } from "@/components/listen/HeadlinesTranscript";
import { HeadlinesWaveform } from "@/components/listen/HeadlinesWaveform";
import { formatDuration, getNarrator } from "@/lib/listen/narrator";
import { useHeadlinesListen } from "@/providers/HeadlinesListenProvider";

export function HeadlinesListenPlayer() {
  const {
    track,
    tracks,
    index,
    playing,
    loading,
    speed,
    currentTime,
    duration,
    togglePlay,
    next,
    prev,
    cycleSpeed,
    seek,
  } = useHeadlinesListen();

  if (!track) {
    return (
      <div className="hl-player hl-player--empty">
        <p>No headlines available to play right now.</p>
        <Link href="/" className="hl-player__cta tap-target">
          Back to homepage
        </Link>
      </div>
    );
  }

  const narrator = getNarrator(track.language);
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remaining = Math.max(0, duration - currentTime);

  return (
    <div className="hl-player">
      <div className="hl-player__hero">
        <p className="hl-player__brand">Listen to Today&apos;s Headlines</p>
        <p className="hl-player__brand-hi">आज की मुख्य खबरें सुनें</p>

        <div className="hl-player__narrator">
          <span className="hl-player__avatar" aria-hidden>
            {narrator.nameHi.charAt(0)}
          </span>
          <div>
            <p className="hl-player__narrator-name">{narrator.nameHi}</p>
            <p className="hl-player__narrator-desk">{narrator.deskHi}</p>
          </div>
        </div>

        <HeadlinesWaveform active={playing && !loading} className="hl-player__wave" />

        <p className="hl-player__headline" lang={track.language === "hi" ? "hi" : undefined}>
          {track.headline}
        </p>
        <p className="hl-player__meta">
          <span>{track.categoryLabel}</span>
          <span aria-hidden> · </span>
          <span>
            {index + 1} / {tracks.length}
          </span>
        </p>

        <div className="hl-player__time">
          <span>{formatDuration(currentTime)}</span>
          <span className="hl-player__time-sep">/</span>
          <span>{formatDuration(duration)}</span>
          <span className="hl-player__time-left">
            −{formatDuration(remaining)}
          </span>
        </div>

        <div
          className="hl-player__scrub"
          role="slider"
          aria-label="Playback position"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            seek(pct * duration);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") seek(Math.min(duration, currentTime + 5));
            if (e.key === "ArrowLeft") seek(Math.max(0, currentTime - 5));
          }}
          tabIndex={0}
        >
          <span className="hl-player__scrub-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="hl-player__controls">
          <button
            type="button"
            className="hl-player__ctrl hl-player__ctrl--ghost tap-target"
            onClick={prev}
            disabled={index === 0}
            aria-label="Previous headline"
          >
            ‹
          </button>

          <button
            type="button"
            className="hl-player__play tap-target"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            disabled={loading}
          >
            <span className="hl-player__play-icon" aria-hidden>
              {loading ? "…" : playing ? "❚❚" : "▶"}
            </span>
            <span className="hl-player__play-label">
              {loading ? "Loading…" : playing ? "Pause" : "Play"}
            </span>
          </button>

          <button
            type="button"
            className="hl-player__ctrl hl-player__ctrl--ghost tap-target"
            onClick={next}
            disabled={index >= tracks.length - 1}
            aria-label="Next headline"
          >
            ›
          </button>
        </div>

        <button
          type="button"
          className="hl-player__speed tap-target"
          onClick={cycleSpeed}
          aria-label={`Playback speed ${speed}x`}
        >
          {speed}×
        </button>
      </div>

      <HeadlinesTranscript
        transcript={track.transcript}
        subtitles={track.subtitles}
        progressMs={Math.round(currentTime * 1000)}
      />

      <Link href={`/story/${track.slug}`} className="hl-player__read tap-target">
        पूरी खबर पढ़ें →
      </Link>
    </div>
  );
}
