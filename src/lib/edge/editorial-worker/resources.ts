/**
 * Best-effort resource measurement for one worker run.
 *
 * Supabase Edge enforces CPU time (2 s, excludes I/O wait), wall clock (150 s Free) and memory (256 MB). What this
 * process can actually observe depends on the runtime, so every figure is reported with whether it was measurable:
 *  - cpu_ms comes from process.cpuUsage() (user + system) when the runtime implements it. Where it does not, cpu_ms is
 *    null and cpu_verified=false - callers must treat CPU as UNVERIFIED, never assume it is within the limit.
 *  - memory is sampled (start, periodic, end) so a peak is reported, not just the final value.
 * Nothing here touches the network or the DB.
 */

type MaybeProcess = {
  cpuUsage?: () => { user: number; system: number };
  memoryUsage?: () => { rss: number; heapUsed: number };
};

function proc(): MaybeProcess | null {
  const p = (globalThis as { process?: MaybeProcess }).process;
  return p ?? null;
}

function readCpuMicros(): number | null {
  try {
    const u = proc()?.cpuUsage?.();
    if (!u || !Number.isFinite(u.user) || !Number.isFinite(u.system)) return null;
    return u.user + u.system;
  } catch {
    return null;
  }
}

function readMemory(): { rss: number; heapUsed: number } | null {
  try {
    const m = proc()?.memoryUsage?.();
    if (m && Number.isFinite(m.rss) && Number.isFinite(m.heapUsed)) return { rss: m.rss, heapUsed: m.heapUsed };
  } catch {
    /* fall through */
  }
  try {
    const d = (globalThis as { Deno?: { memoryUsage?: () => { rss: number; heapUsed: number } } }).Deno?.memoryUsage?.();
    if (d && Number.isFinite(d.rss)) return { rss: d.rss, heapUsed: d.heapUsed };
  } catch {
    /* unavailable */
  }
  return null;
}

export type ResourceReport = {
  wall_ms: number;
  /** CPU time consumed by this run in ms, or null when the runtime cannot report it. */
  cpu_ms: number | null;
  cpu_verified: boolean;
  rss_peak_mb: number | null;
  heap_peak_mb: number | null;
  memory_verified: boolean;
};

const MB = 1024 * 1024;
const round1 = (n: number) => Math.round(n * 10) / 10;

export function startResourceTracker(sampleEveryMs = 250): { stop: () => ResourceReport } {
  const t0 = performance.now();
  const cpu0 = readCpuMicros();
  let rssPeak = 0;
  let heapPeak = 0;
  let memSeen = false;
  const sample = () => {
    const m = readMemory();
    if (!m) return;
    memSeen = true;
    rssPeak = Math.max(rssPeak, m.rss);
    heapPeak = Math.max(heapPeak, m.heapUsed);
  };
  sample();
  const timer = setInterval(sample, sampleEveryMs);
  return {
    stop() {
      clearInterval(timer);
      sample();
      const cpu1 = readCpuMicros();
      const cpuMs = cpu0 !== null && cpu1 !== null ? Math.max(0, (cpu1 - cpu0) / 1000) : null;
      return {
        wall_ms: Math.round(performance.now() - t0),
        cpu_ms: cpuMs === null ? null : round1(cpuMs),
        cpu_verified: cpuMs !== null,
        rss_peak_mb: memSeen ? round1(rssPeak / MB) : null,
        heap_peak_mb: memSeen ? round1(heapPeak / MB) : null,
        memory_verified: memSeen,
      };
    },
  };
}
