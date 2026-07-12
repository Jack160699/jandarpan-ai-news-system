/** Live newsroom polling — calm, throttled defaults */

export const REALTIME_CONFIG = {
  /** Interval poll bounds when realtime is unavailable (ms) */
  pollMinMs: 120_000,
  pollMaxMs: 180_000,
  pollDefaultMs: 150_000,

  /** Longer fallback interval when Supabase realtime is subscribed */
  pollRealtimeMinMs: 180_000,
  pollRealtimeMaxMs: 300_000,

  /** Client-side reuse window — aligns with server homepage cache (~60s) */
  clientSnapshotTtlMs: 55_000,

  /** Debounce burst triggers (realtime / rapid polls) */
  debounceMs: 2_500,

  /** Max new wire rows inserted silently per poll */
  maxSilentWireInserts: 2,

  /** New trending items before “updates available” banner */
  bannerTrendingThreshold: 3,

  /** API cache hint for clients */
  clientCacheMaxAgeSec: 60,
} as const;

/** Jittered interval in [min, max] */
export function jitteredPollMs(
  min: number = REALTIME_CONFIG.pollMinMs,
  max: number = REALTIME_CONFIG.pollMaxMs
): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
