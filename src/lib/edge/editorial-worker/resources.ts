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

type DenoCpu = { user?: number; system?: number };

function readCpuMicros(): number | null {
  try {
    const u = proc()?.cpuUsage?.();
    if (u && Number.isFinite(u.user) && Number.isFinite(u.system)) return u.user + u.system;
  } catch {
    /* fall through to Deno.cpuUsage */
  }
  try {
    const d = (globalThis as { Deno?: { cpuUsage?: () => DenoCpu } }).Deno?.cpuUsage?.();
    if (d && Number.isFinite(d.user) && Number.isFinite(d.system)) return (d.user as number) + (d.system as number);
  } catch {
    /* unavailable */
  }
  return null;
}

/** What this runtime can actually report (for the test-mode response: never assume CPU/memory are measurable). */
export function probeRuntime(): Record<string, unknown> {
  const g = globalThis as {
    Deno?: { version?: { deno?: string }; cpuUsage?: unknown; memoryUsage?: unknown };
    EdgeRuntime?: unknown;
  };
  return {
    deno_version: g.Deno?.version?.deno ?? null,
    has_process_cpuUsage: typeof proc()?.cpuUsage === "function",
    has_deno_cpuUsage: typeof g.Deno?.cpuUsage === "function",
    has_process_memoryUsage: typeof proc()?.memoryUsage === "function",
    has_deno_memoryUsage: typeof g.Deno?.memoryUsage === "function",
    has_edge_runtime_global: g.EdgeRuntime !== undefined,
  };
}

type Mem = { rss: number; heapUsed: number };

/** Merge every memory source: the hosted Edge runtime stubs process.memoryUsage().rss as 0, so take the max per field. */
function readMemory(): Mem | null {
  const out: Mem = { rss: 0, heapUsed: 0 };
  let any = false;
  const take = (m: Partial<Mem> | undefined | null) => {
    if (!m) return;
    if (Number.isFinite(m.rss)) out.rss = Math.max(out.rss, m.rss as number);
    if (Number.isFinite(m.heapUsed)) out.heapUsed = Math.max(out.heapUsed, m.heapUsed as number);
    any = true;
  };
  try {
    take(proc()?.memoryUsage?.());
  } catch {
    /* fall through */
  }
  try {
    take((globalThis as { Deno?: { memoryUsage?: () => Mem } }).Deno?.memoryUsage?.());
  } catch {
    /* unavailable */
  }
  return any ? out : null;
}

export type ResourceReport = {
  wall_ms: number;
  /** CPU time consumed by this run in ms, or null when the runtime cannot report it. */
  cpu_ms: number | null;
  cpu_verified: boolean;
  /** null when the runtime only returns a stubbed 0 (the hosted Edge runtime does for RSS). */
  rss_peak_mb: number | null;
  heap_peak_mb: number | null;
  memory_verified: boolean;
  rss_verified: boolean;
  /** Why CPU is unverified, when it is. */
  cpu_note: string | null;
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
      const deltaMs = cpu0 !== null && cpu1 !== null ? Math.max(0, (cpu1 - cpu0) / 1000) : null;
      // A run always burns CPU. A zero delta (or zero counters) means the runtime STUBS the API - the hosted Supabase
      // Edge runtime logs "Not implemented: process.cpuUsage()" and returns zeros - so it is NOT a measurement.
      const cpuReal = deltaMs !== null && deltaMs > 0 && (cpu1 ?? 0) > 0;
      const cpuNote =
        cpuReal ? null : cpu0 === null || cpu1 === null ? "cpu counters unavailable in this runtime" : "cpu counters return 0 (stubbed) in this runtime";
      return {
        wall_ms: Math.round(performance.now() - t0),
        cpu_ms: cpuReal ? round1(deltaMs as number) : null,
        cpu_verified: cpuReal,
        rss_peak_mb: rssPeak > 0 ? round1(rssPeak / MB) : null,
        heap_peak_mb: heapPeak > 0 ? round1(heapPeak / MB) : null,
        memory_verified: heapPeak > 0 || rssPeak > 0,
        rss_verified: rssPeak > 0,
        cpu_note: cpuNote,
      };
    },
  };
}
