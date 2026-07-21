/**
 * Canonical listen/audio playback states.
 * UI must never show "playing" until the media element fires a valid `playing` event.
 */

export const PLAYER_STATUSES = [
  "unavailable",
  "idle",
  "loading",
  "ready",
  "playing",
  "paused",
  "buffering",
  "ended",
  "failed",
] as const;

export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

export type PlayerErrorCode =
  | "missing_url"
  | "malformed_url"
  | "inaccessible"
  | "expired"
  | "zero_byte"
  | "unsupported_mime"
  | "generation_failed"
  | "stale_pointer"
  | "playback_failed"
  | "autoplay_blocked";

/** User-facing Hindi copy — never leak internals. */
export const PLAYER_ERROR_MESSAGE_HI: Record<PlayerErrorCode, string> = {
  missing_url: "ऑडियो उपलब्ध नहीं",
  malformed_url: "ऑडियो उपलब्ध नहीं",
  inaccessible: "ऑडियो चला नहीं पाए। फिर कोशिश करें।",
  expired: "ऑडियो लिंक समाप्त हो गया। फिर कोशिश करें।",
  zero_byte: "ऑडियो उपलब्ध नहीं",
  unsupported_mime: "यह ऑडियो इस डिवाइस पर नहीं चल सकता।",
  generation_failed: "ऑडियो तैयार नहीं हो सका। फिर कोशिश करें।",
  stale_pointer: "ऑडियो उपलब्ध नहीं",
  playback_failed: "ऑडियो चला नहीं पाए। फिर कोशिश करें।",
  autoplay_blocked: "चलाने के लिए प्ले दबाएँ।",
};

export const PLAYER_ERROR_MESSAGE_EN: Record<PlayerErrorCode, string> = {
  missing_url: "Audio unavailable",
  malformed_url: "Audio unavailable",
  inaccessible: "Could not play audio. Please retry.",
  expired: "Audio link expired. Please retry.",
  zero_byte: "Audio unavailable",
  unsupported_mime: "This audio cannot play on this device.",
  generation_failed: "Audio could not be prepared. Please retry.",
  stale_pointer: "Audio unavailable",
  playback_failed: "Could not play audio. Please retry.",
  autoplay_blocked: "Press play to start.",
};

export function playerErrorMessage(
  code: PlayerErrorCode,
  locale: "hi" | "en" = "hi"
): string {
  return locale === "en"
    ? PLAYER_ERROR_MESSAGE_EN[code]
    : PLAYER_ERROR_MESSAGE_HI[code];
}

export function isPlayableStatus(status: PlayerStatus): boolean {
  return (
    status === "ready" ||
    status === "playing" ||
    status === "paused" ||
    status === "buffering" ||
    status === "ended"
  );
}

export function isBusyStatus(status: PlayerStatus): boolean {
  return status === "loading" || status === "buffering";
}

export function showsPlayingChrome(status: PlayerStatus): boolean {
  return status === "playing" || status === "buffering";
}

export function canRetry(status: PlayerStatus): boolean {
  return status === "failed" || status === "ended";
}

export type PlayerTransitionEvent =
  | { type: "SOURCE_MISSING" }
  | { type: "SOURCE_INVALID"; code: PlayerErrorCode }
  | { type: "LOAD_START" }
  | { type: "CAN_PLAY" }
  | { type: "PLAY_REQUEST" }
  | { type: "PLAYING" }
  | { type: "PAUSE" }
  | { type: "WAITING" }
  | { type: "ENDED" }
  | { type: "ERROR"; code: PlayerErrorCode }
  | { type: "RESET" }
  | { type: "STOP" };

/**
 * Pure reducer — keeps UI state honest relative to media events.
 * Notably: PLAY_REQUEST never yields "playing"; only PLAYING does.
 */
export function reducePlayerStatus(
  status: PlayerStatus,
  event: PlayerTransitionEvent
): PlayerStatus {
  switch (event.type) {
    case "SOURCE_MISSING":
    case "SOURCE_INVALID":
      return "unavailable";
    case "LOAD_START":
      return "loading";
    case "CAN_PLAY":
      if (status === "playing" || status === "buffering") return status;
      if (status === "loading" || status === "idle" || status === "failed") {
        return "ready";
      }
      return status === "unavailable" ? "ready" : status;
    case "PLAY_REQUEST":
      if (status === "unavailable" || status === "failed") return status;
      if (status === "playing") return "playing";
      return status === "ready" || status === "paused" || status === "ended"
        ? "loading"
        : status === "idle"
          ? "loading"
          : status;
    case "PLAYING":
      return "playing";
    case "PAUSE":
      if (status === "unavailable" || status === "failed") return status;
      return "paused";
    case "WAITING":
      return status === "playing" || status === "loading" ? "buffering" : status;
    case "ENDED":
      return "ended";
    case "ERROR":
      return "failed";
    case "RESET":
      return "idle";
    case "STOP":
      return status === "unavailable" ? "unavailable" : "idle";
    default:
      return status;
  }
}
