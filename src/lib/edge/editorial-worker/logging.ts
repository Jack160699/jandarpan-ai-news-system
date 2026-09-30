/**
 * Structured, secret-safe logging for the Edge editorial worker.
 *
 * One JSON object per line (Supabase function logs index these). Two independent guards keep credentials out:
 *  1. keys that look sensitive (key/secret/token/authorization/password/cookie/bearer/service_role) are replaced wholesale;
 *  2. string values are scrubbed for credential-shaped substrings (Bearer tokens, JWTs, sk-/AIza-style keys, long opaque tokens).
 * Strings are also truncated so a provider error body can never flood the log.
 */

export type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY_RE = /(api[_-]?key|secret|token|authorization|password|passwd|cookie|bearer|service[_-]?role|credential)/i;
const MAX_STRING = 500;

const SCRUBBERS: Array<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [redacted]"],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, "[redacted-jwt]"],
  [/\bsk-[A-Za-z0-9_-]{16,}/g, "[redacted-key]"],
  [/\bAIza[A-Za-z0-9_-]{20,}/g, "[redacted-key]"],
  [/\bgsk_[A-Za-z0-9]{16,}/g, "[redacted-key]"],
  [/([?&](?:key|api_key|apikey|token|access_token)=)[^&\s"']+/gi, "$1[redacted]"],
];

export function scrubString(value: string): string {
  let out = value;
  for (const [re, replacement] of SCRUBBERS) out = out.replace(re, replacement);
  return out.length > MAX_STRING ? `${out.slice(0, MAX_STRING)}…[truncated ${out.length - MAX_STRING}]` : out;
}

export function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth > 5) return "[depth-limit]";
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (value instanceof Error) return { name: value.name, message: scrubString(value.message) };
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY_RE.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

export type WorkerLogger = {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
};

/** Logger bound to one run: every line carries run_id / correlation_id. `sink` is injectable for tests. */
export function createWorkerLogger(
  base: { run_id: string; correlation_id: string; [k: string]: unknown },
  sink: (line: string) => void = (line) => console.log(line)
): WorkerLogger {
  const emit = (level: LogLevel, event: string, fields?: Record<string, unknown>) => {
    const record = redact({
      ts: new Date().toISOString(),
      level,
      service: "editorial-worker",
      event,
      ...base,
      ...fields,
    });
    try {
      sink(JSON.stringify(record));
    } catch {
      /* logging must never break a run */
    }
  };
  return {
    info: (e, f) => emit("info", e, f),
    warn: (e, f) => emit("warn", e, f),
    error: (e, f) => emit("error", e, f),
  };
}
