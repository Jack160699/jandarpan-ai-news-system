import type { SubtitleCue } from "@/lib/news/shorts/types";
import type { NewsroomLanguage } from "@/lib/i18n/languages";

export type HeadlineTrack = {
  id: string;
  slug: string;
  headline: string;
  transcript: string;
  durationSec: number;
  voiceStreamPath: string;
  language: NewsroomLanguage;
  categoryLabel: string;
  subtitles: SubtitleCue[];
};

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];
