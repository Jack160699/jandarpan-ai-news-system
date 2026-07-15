export type AudioAnalyticsEvent =
  | "audio_launcher_shown"
  | "audio_launcher_opened"
  | "audio_launcher_dismissed"
  | "audio_play"
  | "audio_pause"
  | "audio_story_skipped"
  | "audio_story_completed"
  | "audio_queue_completed";

export function trackAudioAnalytics(
  eventType: AudioAnalyticsEvent,
  meta?: { slug?: string; index?: number; total?: number }
) {
  if (typeof window === "undefined") return;
  void fetch("/api/audio/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType, ...meta }),
    keepalive: true,
  }).catch(() => {});
}
