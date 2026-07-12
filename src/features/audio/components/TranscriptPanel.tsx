"use client";

import { FileText } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import type { UseAudioV3Return } from "../hooks/useAudioV3";

export type TranscriptPanelProps = {
  audio: UseAudioV3Return;
  className?: string;
};

/**
 * JDP-016 — Live transcript panel with cue highlighting (placeholder).
 */
export function TranscriptPanel({ audio, className }: TranscriptPanelProps) {
  const { track, currentTime, transcriptOpen, setTranscriptOpen } = audio;

  if (!track) return null;

  const cues = track.subtitles?.length
    ? track.subtitles
    : [{ id: "full", startSec: 0, endSec: track.durationSec, text: track.transcript }];

  return (
    <section className={cn("audio-v3-transcript", className)} aria-labelledby="audio-v3-transcript-title">
      <div className="audio-v3-transcript__header">
        <div className="audio-v3-transcript__title-wrap">
          <FileText size={18} aria-hidden />
          <h3 id="audio-v3-transcript-title" className="audio-v3-transcript__title">
            Transcript
          </h3>
        </div>
        <button
          type="button"
          className="audio-v3-transcript__toggle jds-focus-ring"
          onClick={() => setTranscriptOpen((open) => !open)}
          aria-expanded={transcriptOpen}
        >
          {transcriptOpen ? "Hide" : "Show"}
        </button>
      </div>

      {transcriptOpen && (
        <div className="audio-v3-transcript__body" lang={track.language === "hi" ? "hi" : undefined}>
          {cues.map((cue) => {
            const isActive = currentTime >= cue.startSec && currentTime < cue.endSec;
            return (
              <p
                key={cue.id}
                className={cn("audio-v3-transcript__cue", isActive && "audio-v3-transcript__cue--active")}
              >
                {cue.text}
              </p>
            );
          })}
          <p className="audio-v3-placeholder-note">Synced captions will connect to subtitle cues when live.</p>
        </div>
      )}
    </section>
  );
}
