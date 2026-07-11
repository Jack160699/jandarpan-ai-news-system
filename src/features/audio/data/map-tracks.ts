import { buildHeadlinePlaylist } from "@/lib/listen/build-playlist";
import type { NewsShortCard } from "@/lib/news/shorts/types";
import type { AudioTrack } from "../types";

/** Map news shorts to Audio V3 tracks without touching TTS generation. */
export function mapShortsToAudioTracks(shorts: NewsShortCard[]): AudioTrack[] {
  return buildHeadlinePlaylist(shorts).map((track) => ({
    id: track.id,
    slug: track.slug,
    headline: track.headline,
    transcript: track.transcript,
    durationSec: track.durationSec,
    categoryLabel: track.categoryLabel,
    language: track.language,
    subtitles: track.subtitles.map((cue) => ({
      id: cue.id,
      startSec: cue.startMs / 1000,
      endSec: cue.endMs / 1000,
      text: cue.text,
    })),
  }));
}
