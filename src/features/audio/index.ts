export { isAudioV3Enabled } from "./config";
export { AudioExperience } from "./AudioExperience";
export type { AudioExperienceProps } from "./types";
export { AudioPageClient } from "./AudioPageClient";
export type { AudioPageClientProps } from "./AudioPageClient";

export {
  MiniPlayer,
  FullPlayer,
  Queue,
  PlaybackSpeed,
  SleepTimer,
  TranscriptPanel,
  DownloadPlaceholder,
  Playlist,
  ContinueListening,
  VoiceSelector,
} from "./components";

export { useAudioV3 } from "./hooks/useAudioV3";
export type { UseAudioV3Options, UseAudioV3Return } from "./hooks/useAudioV3";

export { AUDIO_TRACKS_PLACEHOLDER, AUDIO_VOICES_PLACEHOLDER, AUDIO_PLAYLISTS_PLACEHOLDER } from "./data/placeholders";
export { mapShortsToAudioTracks } from "./data/map-tracks";

export type {
  AudioTrack,
  AudioVoice,
  AudioPlaylist,
  AudioTranscriptCue,
  ContinueListeningItem,
  SleepTimerPreset,
} from "./types";
