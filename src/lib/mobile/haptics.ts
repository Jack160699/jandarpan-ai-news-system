/** Lightweight haptic feedback via Vibration API (Android) — no-op on unsupported devices */

export type HapticPattern =
  | "light"
  | "medium"
  | "heavy"
  | "selection"
  | "success"
  | "warning";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 28,
  selection: 6,
  success: [10, 40, 14],
  warning: [18, 36, 18],
};

let enabled = true;

export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

export function triggerHaptic(pattern: HapticPattern = "light"): void {
  if (!enabled || typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* unsupported */
  }
}
