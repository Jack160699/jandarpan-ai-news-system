"use client";

import type { NewsShortCard } from "@/lib/news/shorts/types";
import { AudioExperience } from "./AudioExperience";
import { mapShortsToAudioTracks } from "./data/map-tracks";
import { AUDIO_TRACKS_PLACEHOLDER } from "./data/placeholders";

export type AudioPageClientProps = {
  shorts?: NewsShortCard[];
  autoPlay?: boolean;
};

/**
 * JDP-016 — Client shell for /listen when Audio V3 is enabled.
 */
export function AudioPageClient({ shorts, autoPlay }: AudioPageClientProps) {
  const tracks = shorts?.length ? mapShortsToAudioTracks(shorts) : AUDIO_TRACKS_PLACEHOLDER;

  return <AudioExperience tracks={tracks} autoPlay={autoPlay} />;
}
