/** Live newsroom polling — calm, throttled defaults */

export const REALTIME_CONFIG = {
  /** Poll interval bounds (ms) */
  pollMinMs: 60_000,
  pollMaxMs: 120_000,
  pollDefaultMs: 90_000,

  /** Debounce burst triggers (realtime / rapid polls) */
  debounceMs: 2_500,

  /** Max new wire rows inserted silently per poll */
  maxSilentWireInserts: 2,

  /** New trending items before “updates available” banner */
  bannerTrendingThreshold: 3,

  /** API cache hint for clients */
  clientCacheMaxAgeSec: 15,
} as const;

/** Jittered interval in [min, max] */
export function jitteredPollMs(
  min = REALTIME_CONFIG.pollMinMs,
  max = REALTIME_CONFIG.pollMaxMs
): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
