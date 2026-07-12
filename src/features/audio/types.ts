import type { NewsroomLanguage } from "@/lib/i18n/languages";

export type AudioVoice = {
  id: string;
  label: string;
  description: string;
  language: NewsroomLanguage;
  placeholder?: boolean;
};

export type AudioTranscriptCue = {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
};

export type AudioTrack = {
  id: string;
  slug: string;
  headline: string;
  transcript: string;
  durationSec: number;
  categoryLabel: string;
  language: NewsroomLanguage;
  voiceId?: string;
  subtitles?: AudioTranscriptCue[];
  placeholder?: boolean;
};

export type ContinueListeningItem = {
  id: string;
  trackId: string;
  headline: string;
  progressSec: number;
  durationSec: number;
  categoryLabel?: string;
  updatedAt: string;
};

export type AudioPlaylist = {
  id: string;
  title: string;
  description?: string;
  trackIds: string[];
  placeholder?: boolean;
};

export type SleepTimerPreset = {
  id: string;
  label: string;
  minutes: number;
};

export type AudioExperienceProps = {
  tracks?: AudioTrack[];
  autoPlay?: boolean;
  className?: string;
};
