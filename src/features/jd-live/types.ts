/**
 * Jan Darpan Live — broadcast types
 */

export type BroadcastLanguage = "hi" | "en";

export type BroadcastMode = "intro" | "normal" | "breaking" | "transition" | "idle";

export type BroadcastStatus =
  | "initializing"
  | "loading"
  | "playing"
  | "transitioning"
  | "error"
  | "idle";

export type AnchorSpeakState = "idle" | "speaking" | "paused";

/** One story segment ready to broadcast */
export type BroadcastSegment = {
  id: string;
  slug: string;
  headline: string;
  headlineHi?: string;
  headlineEn?: string;
  summary: string;
  summaryHi?: string;
  summaryEn?: string;
  imageUrl: string;
  categoryLabel: string;
  categoryLabelHi?: string;
  categoryLabelEn?: string;
  district?: string | null;
  districtHi?: string | null;
  districtEn?: string | null;
  districtSlug?: string | null;
  section: string;
  isBreaking: boolean;
  isLive: boolean;
  priorityScore: number;
  publishedAt: string;
  /** Script generated for anchor narration */
  script?: string;
  /** TTS audio path (server-generated) */
  ttsPath?: string;
  /** Estimated duration seconds for this segment */
  durationSec?: number;
  /** Countdown rank for TV presentation (10 down to 1) */
  countdownRank?: number;
  /** True if this is the opening broadcast intro segment */
  isIntro?: boolean;
  /** Resolved canonical category tags (e.g. ['crime', 'chhattisgarh']) */
  canonicalCategories?: string[];
  /** Primary dominant category tag */
  primaryCategory?: string;
};

export type BroadcastState = {
  status: BroadcastStatus;
  mode: BroadcastMode;
  language: BroadcastLanguage;
  currentSegment: BroadcastSegment | null;
  currentIndex: number;
  countdownRank: number;
  isIntro: boolean;
  queue: BroadcastSegment[];
  breakingQueue: BroadcastSegment[];
  anchorState: AnchorSpeakState;
  amplitude: number; // 0–1, drives lip-sync
  scriptReady: boolean;
  audioReady: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  audioBlocked: boolean;
  playedIds: string[];
  playedBreakingIds: string[];
  sessionSeed: string;
  segmentToken: number;
  preBreakingIndex?: number;
  selectedCategory: string;
  selectedArticle: BroadcastSegment | null;
};

export type BroadcastAction =
  | { type: "SET_QUEUE"; queue: BroadcastSegment[]; breaking: BroadcastSegment[] }
  | { type: "SET_LANGUAGE"; language: BroadcastLanguage }
  | { type: "SET_MODE"; mode: BroadcastMode }
  | { type: "SET_STATUS"; status: BroadcastStatus }
  | { type: "NEXT_SEGMENT" }
  | { type: "INTERRUPT_BREAKING"; segment: BroadcastSegment }
  | { type: "SET_ANCHOR_STATE"; state: AnchorSpeakState }
  | { type: "SET_AMPLITUDE"; amplitude: number }
  | { type: "SET_SCRIPT"; segmentId: string; script: string; durationSec: number }
  | { type: "SET_AUDIO_READY"; ready: boolean }
  | { type: "SET_SCRIPT_READY"; ready: boolean }
  | { type: "SET_PLAYING"; isPlaying: boolean }
  | { type: "TOGGLE_PLAY" }
  | { type: "SET_MUTED"; isMuted: boolean }
  | { type: "TOGGLE_MUTE" }
  | { type: "SET_AUDIO_BLOCKED"; blocked: boolean }
  | { type: "SET_CATEGORY"; category: string }
  | { type: "SET_SELECTED_ARTICLE"; article: BroadcastSegment | null };
