/**
 * Read-mostly diagnostics for the Redis-backed provider quota governor, runnable from inside the Edge runtime
 * (`quota_probe` mode of the editorial worker; authenticated, no editorial work, no database writes).
 *
 * - governorProbe: reserve/observe phases on a THROWAWAY codecraft model name (it inherits exactly the internal
 *   codecraft limits), so a later, separate invocation can prove it sees the same counters and is denied.
 * - aiRoundTrip: exactly one tiny real CodeCraft request through the app's own path, with the real counters read
 *   before/after so reported token usage and its reconciliation into Redis are visible.
 */

import { requestCodeCraftChat, resolveCodeCraftModel, isCodeCraftConfigured } from "@/lib/ai/providers/codecraft";
import { acquireConcurrencySlot, getProviderLimits, reserveQuota } from "@/lib/ai/providers/quota";
import { redisDel, redisGet } from "@/lib/infrastructure/cache/redis";

export const PROBE_MODEL_RE = /^edge-probe-[a-z0-9]{4,16}$/;
const SCOPES = ["rpm", "tpm", "rpd", "tpd"] as const;
type Counters = Record<(typeof SCOPES)[number], string | null>;

const bucket = (model: string, scope: string) => `ai-quota:codecraft:${model}:${scope}`;

async function readCounters(model: string): Promise<Counters> {
  const out = {} as Counters;
  for (const s of SCOPES) out[s] = await redisGet(bucket(model, s));
  return out;
}

async function clearCounters(model: string): Promise<void> {
  for (const s of SCOPES) await redisDel(bucket(model, s));
}

export type GovernorProbeResult = {
  phase: "reserve" | "observe";
  model: string;
  limits: { rpm: number; tpm: number; rpd: number; tpd: number | null; max_concurrent: number };
  seen_on_arrival: Counters;
  attempts: number;
  allowed: number;
  denied: number;
  denied_scopes: string[];
  counters_after: Counters;
  concurrency: { max: number; first_acquired: boolean; second_acquired: boolean; after_release_acquired: boolean };
  cleaned_up: boolean;
};

export async function governorProbe(input: { phase: "reserve" | "observe"; model: string }): Promise<GovernorProbeResult> {
  const { phase, model } = input;
  const limits = getProviderLimits("codecraft", model);
  const seen = await readCounters(model);

  const attempts = phase === "reserve" ? 10 : 3;
  const results = await Promise.all(
    Array.from({ length: attempts }, () => reserveQuota({ provider: "codecraft", model, operation: "edge_probe", estimatedTokens: 100 })),
  );
  const allowed = results.filter((r) => r.allowed).length;
  const deniedScopes = [...new Set(results.flatMap((r) => (r.allowed ? [] : [r.scope])))];
  const after = await readCounters(model);

  // The in-flight slot is per-isolate (the cross-invocation guard is the run lease); prove the cap itself.
  const a = acquireConcurrencySlot("codecraft");
  const b = acquireConcurrencySlot("codecraft");
  a.release();
  b.release();
  const c = acquireConcurrencySlot("codecraft");
  c.release();

  if (phase === "observe") await clearCounters(model);

  return {
    phase,
    model,
    limits: { rpm: limits.rpm, tpm: limits.tpm, rpd: limits.rpd, tpd: limits.tpd, max_concurrent: limits.maxConcurrent },
    seen_on_arrival: seen,
    attempts,
    allowed,
    denied: attempts - allowed,
    denied_scopes: deniedScopes,
    counters_after: after,
    concurrency: { max: limits.maxConcurrent, first_acquired: a.acquired, second_acquired: b.acquired, after_release_acquired: c.acquired },
    cleaned_up: phase === "observe",
  };
}

export type AiRoundTripResult = {
  ok: boolean;
  model: string | null;
  provider?: string;
  latency_ms: number | null;
  error_code?: string;
  json_valid?: boolean;
  counters_before?: Counters;
  counters_after?: Counters;
  /** After reconciliation the daily token counter moves by the REAL reported usage (reserved estimate corrected). */
  tpd_delta?: number | null;
  tpm_delta?: number | null;
  rpd_delta?: number | null;
};

const num = (v: string | null) => (v === null ? 0 : Number(v));

export async function aiRoundTrip(): Promise<AiRoundTripResult> {
  if (!isCodeCraftConfigured()) return { ok: false, model: null, latency_ms: null, error_code: "codecraft_not_configured" };
  const model = resolveCodeCraftModel("editorial_generate");
  const before = await readCounters(model);
  const t0 = Date.now();
  const r = await requestCodeCraftChat({
    operation: "editorial_generate",
    system: "You are a terse JSON API. Reply with JSON only.",
    user: 'Return exactly this JSON and nothing else: {"ok": true, "lang": "hi", "word": "समाचार"}',
    maxTokens: 1024,
    temperature: 0,
    jsonMode: true,
  });
  const latency = Date.now() - t0;
  const after = await readCounters(model);
  let jsonValid: boolean | undefined;
  if (r.ok) {
    try {
      jsonValid = JSON.parse(r.content).ok === true;
    } catch {
      jsonValid = false;
    }
  }
  return {
    ok: r.ok,
    model,
    provider: r.provider,
    latency_ms: latency,
    ...(r.ok ? {} : { error_code: r.error.code }),
    json_valid: jsonValid,
    counters_before: before,
    counters_after: after,
    tpd_delta: num(after.tpd) - num(before.tpd),
    tpm_delta: num(after.tpm) - num(before.tpm),
    rpd_delta: num(after.rpd) - num(before.rpd),
  };
}
