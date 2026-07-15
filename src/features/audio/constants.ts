import type { PlaybackSpeed } from "@/lib/listen/types";
import type { SleepTimerPreset } from "./types";

export const AUDIO_PLAYBACK_SPEEDS: PlaybackSpeed[] = [1, 1.25, 1.5, 2];

export const AUDIO_SLEEP_TIMER_PRESETS: SleepTimerPreset[] = [
  { id: "5", label: "5 min", minutes: 5 },
  { id: "15", label: "15 min", minutes: 15 },
  { id: "30", label: "30 min", minutes: 30 },
  { id: "45", label: "45 min", minutes: 45 },
  { id: "60", label: "1 hour", minutes: 60 },
];

export const AUDIO_PLACEHOLDER_NOTE =
  "Placeholder playback — connect HeadlinesListenProvider or TTS stream when ready.";
