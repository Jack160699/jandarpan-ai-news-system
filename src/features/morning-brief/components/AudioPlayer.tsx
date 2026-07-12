"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Headphones,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { buttonVariants } from "@/design-system/components/Button";
import { cn } from "@/design-system/utils/cn";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { BriefCard } from "./BriefCard";
import type { MorningBriefAudioTrack } from "../types";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type AudioPlayerProps = {
  tracks: MorningBriefAudioTrack[];
  listenHref?: string;
  autoPlay?: boolean;
};

/**
 * Standalone brief audio player — UI-only playback simulation until TTS feed ships.
 */
export function AudioPlayer({ tracks, listenHref = "/listen", autoPlay }: AudioPlayerProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(Boolean(autoPlay));
  const [currentTime, setCurrentTime] = useState(0);

  const track = tracks[index];
  const duration = track?.durationSec ?? 0;
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const togglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, tracks.length - 1));
    setCurrentTime(0);
  }, [tracks.length]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
    setCurrentTime(0);
  }, []);

  useEffect(() => {
    if (!playing || !track) return undefined;

    const timer = window.setInterval(() => {
      setCurrentTime((t) => {
        if (t >= duration) {
          if (index < tracks.length - 1) {
            setIndex((i) => i + 1);
            return 0;
          }
          setPlaying(false);
          return duration;
        }
        return t + 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [playing, track, duration, index, tracks.length]);

  useEffect(() => {
    setCurrentTime(0);
  }, [index]);

  const listenLink = useMemo(() => listenHref, [listenHref]);

  if (!track) {
    return (
      <BriefCard id="mb-audio">
        <p className="mb-audio__empty">Audio briefing will appear here soon.</p>
        <Link href={listenLink} className={cn(buttonVariants({ variant: "outline" }))}>
          <Headphones size={16} aria-hidden />
          Open Listen
        </Link>
      </BriefCard>
    );
  }

  return (
    <BriefCard id="mb-audio" aria-labelledby="mb-audio-title">
      <SectionHeader title="Audio Brief" kicker="Listen on the go" />
      <h2 id="mb-audio-title" className="sr-only">
        Morning brief audio player
      </h2>

      <div className="mb-audio">
        <p className="mb-audio__track-title">{track.title}</p>
        <p className="mb-audio__meta">
          {track.categoryLabel ? <span>{track.categoryLabel}</span> : null}
          <span aria-hidden> · </span>
          <span>
            {index + 1} / {tracks.length}
          </span>
        </p>

        <div className="mb-audio__progress" aria-hidden>
          <div className="mb-audio__progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="mb-audio__time">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>

        <div className="mb-audio__controls">
          <button
            type="button"
            className="mb-audio__control"
            onClick={prev}
            disabled={index === 0}
            aria-label="Previous track"
          >
            <SkipBack size={20} />
          </button>
          <button
            type="button"
            className={cn("mb-audio__control", "mb-audio__control--primary")}
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button
            type="button"
            className="mb-audio__control"
            onClick={next}
            disabled={index >= tracks.length - 1}
            aria-label="Next track"
          >
            <SkipForward size={20} />
          </button>
        </div>

        <p className="mb-placeholder-note">
          Simulated playback — full audio on{" "}
          <Link href={listenLink} className="mb-link">
            Listen
          </Link>
          .
        </p>
      </div>
    </BriefCard>
  );
}
