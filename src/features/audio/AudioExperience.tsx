"use client";

import Link from "next/link";
import { Headphones } from "lucide-react";
import { buttonVariants } from "@/design-system/components/Button";
import { cn } from "@/design-system/utils/cn";
import { HomeSectionErrorBoundary } from "@/components/errors/HomeSectionErrorBoundary";
import {
  ContinueListening,
  DownloadPlaceholder,
  FullPlayer,
  MiniPlayer,
  PlaybackSpeed,
  Playlist,
  Queue,
  SleepTimer,
  TranscriptPanel,
  VoiceSelector,
} from "./components";
import { AUDIO_TRACKS_PLACEHOLDER } from "./data/placeholders";
import { useAudioV3 } from "./hooks/useAudioV3";
import type { AudioExperienceProps } from "./types";
import "./styles/audio.css";

/**
 * JDP-016 — Audio Experience V3
 *
 * Presentation-only listen shell with placeholder playback.
 * Wire `useAudioV3` to HeadlinesListenProvider when promoting to production.
 */
export function AudioExperience({ tracks = AUDIO_TRACKS_PLACEHOLDER, autoPlay, className }: AudioExperienceProps) {
  const audio = useAudioV3({ tracks, autoPlay });
  const hasTracks = tracks.length > 0;

  if (!hasTracks) {
    return (
      <div className={cn("audio-v3-root jds-root", className)}>
        <div className="audio-v3-empty">
          <Headphones size={32} aria-hidden />
          <h2 className="audio-v3-empty__title">No headlines to play yet</h2>
          <p className="audio-v3-empty__desc">
            Check back when today&apos;s edition is published, or browse live updates.
          </p>
          <Link href="/live" className={cn(buttonVariants({ variant: "outline" }), "audio-v3-empty__cta")}>
            Go to live desk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("audio-v3-root jds-root", className)}>
      <div className="audio-v3-page">
        <HomeSectionErrorBoundary name="audio-full-player">
          <FullPlayer audio={audio} />
        </HomeSectionErrorBoundary>

        <div className="audio-v3-layout">
          <aside className="audio-v3-layout__side">
            <HomeSectionErrorBoundary name="audio-continue">
              <ContinueListening audio={audio} />
            </HomeSectionErrorBoundary>
            <HomeSectionErrorBoundary name="audio-playlist">
              <Playlist audio={audio} />
            </HomeSectionErrorBoundary>
          </aside>

          <div className="audio-v3-layout__main">
            <HomeSectionErrorBoundary name="audio-controls">
              <div className="audio-v3-controls">
                <PlaybackSpeed audio={audio} />
                <SleepTimer audio={audio} />
                <VoiceSelector audio={audio} />
                <DownloadPlaceholder audio={audio} />
              </div>
            </HomeSectionErrorBoundary>

            <HomeSectionErrorBoundary name="audio-transcript">
              <TranscriptPanel audio={audio} />
            </HomeSectionErrorBoundary>

            <HomeSectionErrorBoundary name="audio-queue">
              <Queue audio={audio} />
            </HomeSectionErrorBoundary>
          </div>
        </div>
      </div>

      <MiniPlayer audio={audio} className="audio-v3-mini--dock" />
    </div>
  );
}
