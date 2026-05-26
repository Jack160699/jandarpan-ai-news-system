/**
 * Enterprise observability — structured debug tags for production hardening.
 * Enable: ADMIN_DEBUG=1 or NEXT_PUBLIC_ADMIN_DEBUG=1
 */

export type PerfTag =
  | "AUTH"
  | "QUERY"
  | "CACHE"
  | "EDITOR"
  | "REALTIME"
  | "API"
  | "PROVIDER"
  | "HYDRATION"
  | "DEGRADED_MODE";

type MetricKind = "timing" | "counter" | "event";

type MetricEntry = {
  tag: PerfTag;
  name: string;
  kind: MetricKind;
  at: number;
  ms?: number;
  extra?: Record<string, unknown>;
};

const MAX_BUFFER = 200;
const buffer: MetricEntry[] = [];

function shouldTrace(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ADMIN_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_DEBUG === "1"
  );
}

function push(entry: MetricEntry) {
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.shift();
}

export function tracePerf(
  tag: PerfTag,
  name: string,
  extra?: Record<string, unknown>
): void {
  push({ tag, name, kind: "event", at: Date.now(), extra });
  if (!shouldTrace()) return;
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${tag}]`, `${name}${payload}`);
}

export function tracePerfTiming(
  tag: PerfTag,
  name: string,
  startedAt: number,
  extra?: Record<string, unknown>
): void {
  const ms = Date.now() - startedAt;
  push({ tag, name, kind: "timing", at: Date.now(), ms, extra });
  if (!shouldTrace()) return;
  const payload = extra ? ` ${JSON.stringify({ ms, ...extra })}` : ` ${JSON.stringify({ ms })}`;
  console.log(`[${tag}]`, `${name}${payload}`);
}

export function traceDegraded(
  subsystem: string,
  reason: string,
  extra?: Record<string, unknown>
): void {
  tracePerf("DEGRADED_MODE", `${subsystem}:${reason}`, extra);
}

export function getPerfBuffer(): readonly MetricEntry[] {
  return buffer;
}

export function clearPerfBuffer(): void {
  buffer.length = 0;
}
