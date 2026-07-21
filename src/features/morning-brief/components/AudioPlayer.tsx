"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Headphones,
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
 * Morning-brief teaser — does not simulate silent playback.
 * Real audio lives on /listen; this surface points users there.
 */
export function AudioPlayer({ tracks, listenHref = "/listen" }: AudioPlayerProps) {
  const [index, setIndex] = useState(0);

  const track = tracks[index];
  const duration = track?.durationSec ?? 0;
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
          <span aria-hidden> · </span>
          <span>{formatDuration(duration)}</span>
        </p>

        <p className="mb-audio__unavailable" role="status">
          ऑडियो उपलब्ध नहीं — पूरा वाचन सुनें पर चलाएँ।
        </p>

        <div className="mb-audio__controls">
          <button
            type="button"
            className="mb-audio__control"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            aria-label="Previous track"
          >
            <SkipBack size={20} />
          </button>
          <Link
            href={`${listenLink}?play=1`}
            className={cn("mb-audio__control", "mb-audio__control--primary")}
            aria-label="सुनें पर चलाएँ"
          >
            <Headphones size={24} />
          </Link>
          <button
            type="button"
            className="mb-audio__control"
            onClick={() => setIndex((i) => Math.min(tracks.length - 1, i + 1))}
            disabled={index >= tracks.length - 1}
            aria-label="Next track"
          >
            <SkipForward size={20} />
          </button>
        </div>

        <p className="mb-placeholder-note">
          Full Hindi audio on{" "}
          <Link href={listenLink} className="mb-link">
            Listen
          </Link>
          .
        </p>
      </div>
    </BriefCard>
  );
}
