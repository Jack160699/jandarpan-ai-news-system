/**
 * News shorts — mobile-first short-form types
 */

import type { HomeSectionId } from "@/lib/homepage/types";
import type { NewsroomLanguage } from "@/lib/i18n/languages";

export type ShortStatus = "pending" | "ready" | "failed";

export type SubtitleCue = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
};

export type ReelSlide = {
  id: string;
  startMs: number;
  endMs: number;
  headline: string;
  caption: string;
  imageUrl: string;
  highlight?: string;
};

export type ShortVoiceMeta = {
  status: "ready" | "pending" | "failed" | "unavailable";
  language: NewsroomLanguage;
  voiceId: string;
  durationSec: number;
  /** Stream via /api/shorts/voice/[slug] */
  streamPath: string;
  generatedAt?: string;
  error?: string;
};

export type NewsShortBundle = {
  version: 1;
  status: ShortStatus;
  durationSec: number;
  summary60s: string;
  anchorLine: string;
  script: string;
  highlights: string[];
  subtitles: SubtitleCue[];
  reel: {
    aspect: "9:16";
    slides: ReelSlide[];
  };
  voice: ShortVoiceMeta;
  styleId: string;
  section: HomeSectionId;
  language: NewsroomLanguage;
  generatedAt: string;
  model?: string;
  error?: string;
};

export type NewsShortCard = {
  articleId: string;
  slug: string;
  headline: string;
  summary60s: string;
  anchorLine: string;
  imageUrl: string;
  /** Optional MP4/HLS — falls back to image reel when absent */
  videoUrl?: string | null;
  section: HomeSectionId;
  styleId: string;
  durationSec: number;
  highlights: string[];
  hasVoice: boolean;
  voiceStreamPath: string;
  publishedAt: string;
  language: NewsroomLanguage;
  subtitles: SubtitleCue[];
  reelSlides: ReelSlide[];
  /** Hindi category label for overlay */
  categoryLabel: string;
  /** Reporter or wire source */
  sourceLabel: string;
  sourceCount: number;
  isLive: boolean;
};
