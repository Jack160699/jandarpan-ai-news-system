"use client";

import { Download } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import type { UseAudioV3Return } from "../hooks/useAudioV3";

export type DownloadPlaceholderProps = {
  audio: UseAudioV3Return;
  className?: string;
};

/**
 * JDP-016 — Offline download affordance (placeholder, no file I/O).
 */
export function DownloadPlaceholder({ audio, className }: DownloadPlaceholderProps) {
  const { track } = audio;

  return (
    <div className={cn("audio-v3-download", className)} aria-labelledby="audio-v3-download-label">
      <div className="audio-v3-download__header">
        <Download size={18} aria-hidden />
        <span id="audio-v3-download-label" className="audio-v3-download__label">
          Download for offline
        </span>
      </div>

      <p className="audio-v3-download__desc">
        Save today&apos;s briefing to your device. Downloads will use cached MP3 streams — not wired yet.
      </p>

      <button
        type="button"
        className="audio-v3-download__btn jds-focus-ring"
        disabled
        aria-disabled="true"
        title="Coming soon"
      >
        <Download size={16} aria-hidden />
        {track ? "Download current track" : "Download playlist"}
      </button>

      <p className="audio-v3-placeholder-note">Placeholder — offline storage ships in a later release.</p>
    </div>
  );
}
