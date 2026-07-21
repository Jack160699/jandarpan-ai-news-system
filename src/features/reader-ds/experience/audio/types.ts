export type VoiceAvailability =
  | "ready"
  | "pending"
  | "failed"
  | "unavailable";

export type BriefingTrack = {
  id: string;
  slug: string;
  headline: string;
  durationSec: number;
  durationLabel: string;
  imageUrl?: string | null;
  /** Real voice stream when available (shorts voice API). */
  streamPath?: string | null;
  /** Generation / cache hint — never auto-trigger TTS from page view. */
  voiceStatus?: VoiceAvailability;
};

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function estimateDurationSec(headline: string, summary?: string | null): number {
  const words = `${headline} ${summary ?? ""}`.trim().split(/\s+/).filter(Boolean).length;
  // ~2.5 words/sec Hindi narration estimate from real text length
  return Math.max(35, Math.min(180, Math.round(words / 2.5) + 20));
}

export function trackHasPlayableSource(track: BriefingTrack | null | undefined): boolean {
  if (!track) return false;
  if (track.voiceStatus === "failed" || track.voiceStatus === "unavailable") {
    return false;
  }
  return Boolean(track.streamPath?.trim());
}
