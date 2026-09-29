/** Shared types for the Jandarpan voice (text-to-speech) module. Server-side only. */

export const VOICE_LANGUAGES = ["hi-IN", "en-IN"] as const;
export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number];

/** Delivery styles — how the anchor reads the story. */
export const DELIVERY_STYLES = [
  "breaking_news",
  "urgency",
  "standard_bulletin",
  "serious_report",
  "human_interest",
  "sports",
  "weather",
  "explainer",
] as const;
export type DeliveryStyle = (typeof DELIVERY_STYLES)[number];

/** Which script the audio is built from. */
export const SCRIPT_KINDS = ["radio", "tv", "short_bulletin"] as const;
export type ScriptKind = (typeof SCRIPT_KINDS)[number];

export type TtsProviderId = "gemini_tts" | "chirp3_hd";

export type TtsRequest = {
  text: string;
  language: VoiceLanguage;
  style: DeliveryStyle;
  /** Provider-specific voice name; defaults come from voice-config. */
  voiceName?: string;
  /** Hard cap for one attempt. */
  timeoutMs?: number;
};

export type TtsSuccess = {
  ok: true;
  provider: TtsProviderId;
  model: string;
  voiceName: string;
  audio: Uint8Array;
  mimeType: "audio/mpeg";
  latencyMs: number;
  characters: number;
  requestId: string | null;
};

export type TtsFailure = {
  ok: false;
  provider: TtsProviderId;
  code:
    | "not_configured"
    | "unauthorized"
    | "quota"
    | "model_unavailable"
    | "invalid_request"
    | "timeout"
    | "upstream"
    | "empty_audio"
    | "network";
  message: string;
  httpStatus?: number;
  latencyMs: number;
};

export type TtsResult = TtsSuccess | TtsFailure;

export type TtsAttemptLog = {
  provider: TtsProviderId;
  model: string | null;
  attempt: number;
  ok: boolean;
  latencyMs: number;
  error?: string;
  fallbackUsed: boolean;
};

export type SynthesisOutcome =
  | { ok: true; result: TtsSuccess; attempts: TtsAttemptLog[]; fallbackUsed: boolean }
  | { ok: false; attempts: TtsAttemptLog[]; error: string };
