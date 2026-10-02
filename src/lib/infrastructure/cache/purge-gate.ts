/**
 * Debounce for site-cache purges. Every purge forces the next list / hub / sitemap request to re-read its pool from Supabase
 * (~0.7 MB for the 160-row list pool), so a publish may purge at most once per window; the cache TTLs bound staleness in between.
 *
 * Atomic (Redis SET NX EX): of N concurrent publishers exactly one wins the window. If the gate cannot be read (Redis down) the purge
 * is SKIPPED -- failing toward fewer Supabase reads, never toward more.
 */

export const PURGE_GATE_KEY = "jd:site-purge-gate";
export const PURGE_DEBOUNCE_SECONDS = 1800;
export const PURGE_GATE_SCRIPT =
  "local r = redis.call('SET', KEYS[1], '1', 'NX', 'EX', tonumber(ARGV[1])); if r then return 1 else return 0 end";

export type PurgeOutcome = "purged" | "debounced" | "gate_unavailable";

export async function purgeOncePerWindow(
  evalGate: (script: string, keys: string[], args: Array<string | number>) => Promise<number | null>,
  purge: () => Promise<void>,
  windowSeconds: number = PURGE_DEBOUNCE_SECONDS
): Promise<PurgeOutcome> {
  const gate = await evalGate(PURGE_GATE_SCRIPT, [PURGE_GATE_KEY], [windowSeconds]).catch(() => null);
  if (gate === 1) {
    await purge();
    return "purged";
  }
  return gate === 0 ? "debounced" : "gate_unavailable";
}
