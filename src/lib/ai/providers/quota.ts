/**
 * Provider quota + rate controller.
 *
 * Reservations are atomic: rpm/tpm/rpd/tpd are checked-and-incremented in a
 * single Redis Lua script (see RESERVE_SCRIPT) so a request either consumes
 * all four scopes or none of them — there is no window where a later scope
 * rejecting the request leaves an earlier scope permanently decremented.
 * When Redis isn't configured, the same all-or-nothing check runs against a
 * process-local Map; this is safe against same-process races (no `await`
 * between check and write) but — like every in-memory fallback in this
 * codebase — does not coordinate across separate serverless instances.
 *
 * Quota buckets are keyed by provider *and* model where a model-specific
 * limit is known (Groq's per-model limits differ significantly), and fall
 * back to a provider-level bucket otherwise. This prevents one model's
 * larger allowance from silently authorizing traffic on a different model.
 *
 * TPM/TPD start from a pre-request token *estimate* (we don't know the exact
 * cost until the provider responds) and are corrected afterwards via
 * reconcileQuotaUsage() — the estimate is never reported as if it were
 * exact; see AiProviderUsageRecord's own estimated-vs-actual fields.
 *
 * Hard rule: quota exhaustion is terminal for the current request. Callers
 * must not loop-retry on `allowed: false` — fall through to the next
 * provider/model in the chain (see router.ts) or fail the operation.
 */

import { isRedisConfigured, redisEval, redisGet, redisIncrBy } from "@/lib/infrastructure/cache/redis";
import type { AiProviderId } from "@/lib/ai/providers/types";

export type QuotaScope = "rpm" | "tpm" | "rpd" | "tpd";
export type QuotaPriority = "breaking" | "normal" | "backfill";

type ProviderLimits = {
  rpm: number;
  tpm: number;
  rpd: number;
  tpd: number;
  maxConcurrent: number;
};

/**
 * Provider-level fallback limits, used when no model-specific entry exists
 * in MODEL_LIMITS below (or no model was supplied). Conservative starting
 * points — verify against each provider's actual account dashboard.
 *
 * Gemini specifically: these numbers are NOT sourced from your account.
 * Google publishes rate limits per-project in AI Studio, not as a static
 * table — read the real numbers at https://aistudio.google.com/rate-limit
 * once your API key exists and set AI_QUOTA_GEMINI_*_LIMIT accordingly.
 */
const PROVIDER_DEFAULT_LIMITS: Record<AiProviderId, ProviderLimits> = {
  gemini: { rpm: 10, tpm: 250_000, rpd: 250, tpd: 2_000_000, maxConcurrent: 2 },
  groq: { rpm: 28, tpm: 5_000, rpd: 1_000, tpd: 150_000, maxConcurrent: 2 },
  cloudflare: { rpm: 40, tpm: 2_000_000, rpd: 9_000, tpd: 20_000_000, maxConcurrent: 1 },
  openrouter: { rpm: 18, tpm: 200_000, rpd: 190, tpd: 2_000_000, maxConcurrent: 1 },
  openai: { rpm: 0, tpm: 0, rpd: 0, tpd: 0, maxConcurrent: 0 },
  local: { rpm: 100_000, tpm: 100_000_000, rpd: 100_000_000, tpd: 100_000_000, maxConcurrent: 100 },
};

/**
 * Model-specific overrides — only populated where the limit is actually
 * sourced (either from you directly or from a provider's published rate
 * limit docs), never guessed. A model with no entry here falls back to its
 * provider's PROVIDER_DEFAULT_LIMITS bucket.
 *
 * - openai/gpt-oss-120b, llama-3.1-8b-instant: your specified conservative
 *   free-plan defaults.
 * - llama-3.3-70b-versatile: Groq's published free-tier rate limits
 *   (console.groq.com/docs/rate-limits) as of Aug 2026: 30 RPM, 1K RPD,
 *   12K TPM, 100K TPD.
 * - qwen/qwen3.6-27b: intentionally absent — no sourced number exists yet,
 *   so it uses the groq provider-level default until you add a real entry.
 */
const MODEL_LIMITS: Partial<Record<AiProviderId, Record<string, ProviderLimits>>> = {
  groq: {
    "openai/gpt-oss-120b": { rpm: 28, tpm: 7_000, rpd: 900, tpd: 180_000, maxConcurrent: 2 },
    "llama-3.1-8b-instant": { rpm: 28, tpm: 5_500, rpd: 13_000, tpd: 450_000, maxConcurrent: 2 },
    "llama-3.3-70b-versatile": { rpm: 30, tpm: 12_000, rpd: 1_000, tpd: 100_000, maxConcurrent: 2 },
  },
};

/** Fraction of each bucket's daily request budget held back for breaking news. Read at call time, not frozen at module load. */
function getBreakingNewsReserveFraction(): number {
  const raw = process.env.AI_QUOTA_BREAKING_RESERVE_FRACTION;
  const parsed = raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 0.18;
}

function sanitizeModelForEnv(model: string): string {
  return model.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function envLimit(provider: AiProviderId, model: string | null, scope: QuotaScope, fallback: number): number {
  if (model) {
    const modelKey = `AI_QUOTA_${provider.toUpperCase()}_${sanitizeModelForEnv(model)}_${scope.toUpperCase()}_LIMIT`;
    const modelRaw = process.env[modelKey];
    const modelParsed = modelRaw ? Number(modelRaw) : NaN;
    if (Number.isFinite(modelParsed) && modelParsed > 0) return modelParsed;
  }
  const providerKey = `AI_QUOTA_${provider.toUpperCase()}_${scope.toUpperCase()}_LIMIT`;
  const raw = process.env[providerKey];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Resolves the effective limits for a provider (+ optional model), applying model-safe env overrides. */
export function getProviderLimits(provider: AiProviderId, model?: string | null): ProviderLimits {
  const base = (model && MODEL_LIMITS[provider]?.[model]) || PROVIDER_DEFAULT_LIMITS[provider];
  return {
    rpm: envLimit(provider, model ?? null, "rpm", base.rpm),
    tpm: envLimit(provider, model ?? null, "tpm", base.tpm),
    rpd: envLimit(provider, model ?? null, "rpd", base.rpd),
    tpd: envLimit(provider, model ?? null, "tpd", base.tpd),
    maxConcurrent: base.maxConcurrent,
  };
}

function bucketKey(provider: AiProviderId, model: string | null, scope: QuotaScope): string {
  return model ? `ai-quota:${provider}:${model}:${scope}` : `ai-quota:${provider}:${scope}`;
}

// --- Atomic multi-scope reservation ------------------------------------

/**
 * Checks all four scopes and, only if every one has room, increments all
 * four in the same script invocation. No partial consumption is possible:
 * either every scope is charged, or none are.
 */
const RESERVE_SCRIPT = `
local rpmKey, tpmKey, rpdKey, tpdKey = KEYS[1], KEYS[2], KEYS[3], KEYS[4]
local reqW = tonumber(ARGV[1])
local tokW = tonumber(ARGV[2])
local rpmLimit = tonumber(ARGV[3])
local tpmLimit = tonumber(ARGV[4])
local rpdLimit = tonumber(ARGV[5])
local tpdLimit = tonumber(ARGV[6])
local shortTtl = ARGV[7]
local longTtl = ARGV[8]

local rpm = tonumber(redis.call('GET', rpmKey) or '0')
local tpm = tonumber(redis.call('GET', tpmKey) or '0')
local rpd = tonumber(redis.call('GET', rpdKey) or '0')
local tpd = tonumber(redis.call('GET', tpdKey) or '0')

if rpm + reqW > rpmLimit then return {0, 'rpm'} end
if tpm + tokW > tpmLimit then return {0, 'tpm'} end
if rpd + reqW > rpdLimit then return {0, 'rpd'} end
if tpd + tokW > tpdLimit then return {0, 'tpd'} end

redis.call('INCRBY', rpmKey, reqW)
if rpm == 0 then redis.call('EXPIRE', rpmKey, shortTtl) end
redis.call('INCRBY', tpmKey, tokW)
if tpm == 0 then redis.call('EXPIRE', tpmKey, shortTtl) end
redis.call('INCRBY', rpdKey, reqW)
if rpd == 0 then redis.call('EXPIRE', rpdKey, longTtl) end
redis.call('INCRBY', tpdKey, tokW)
if tpd == 0 then redis.call('EXPIRE', tpdKey, longTtl) end

return {1, 'ok'}
`;

type MemoryCounter = { value: number; resetAt: number };
const memoryCounters = new Map<string, MemoryCounter>();

function memoryGet(key: string, now: number): number {
  const c = memoryCounters.get(key);
  if (!c || c.resetAt <= now) return 0;
  return c.value;
}

function memorySet(key: string, value: number, windowMs: number, now: number, hadPriorEntry: boolean): void {
  const existing = memoryCounters.get(key);
  const resetAt = hadPriorEntry && existing && existing.resetAt > now ? existing.resetAt : now + windowMs;
  memoryCounters.set(key, { value, resetAt });
}

/** In-process equivalent of RESERVE_SCRIPT — safe against same-process races (no await between check and write). */
function reserveInMemory(
  keys: [string, string, string, string],
  reqW: number,
  tokW: number,
  limits: [number, number, number, number],
  windowsMs: [number, number, number, number]
): { ok: true } | { ok: false; scope: QuotaScope } {
  const now = Date.now();
  const [rpmKey, tpmKey, rpdKey, tpdKey] = keys;
  const [rpmLimit, tpmLimit, rpdLimit, tpdLimit] = limits;

  const rpm = memoryGet(rpmKey, now);
  const tpm = memoryGet(tpmKey, now);
  const rpd = memoryGet(rpdKey, now);
  const tpd = memoryGet(tpdKey, now);

  if (rpm + reqW > rpmLimit) return { ok: false, scope: "rpm" };
  if (tpm + tokW > tpmLimit) return { ok: false, scope: "tpm" };
  if (rpd + reqW > rpdLimit) return { ok: false, scope: "rpd" };
  if (tpd + tokW > tpdLimit) return { ok: false, scope: "tpd" };

  memorySet(rpmKey, rpm + reqW, windowsMs[0], now, rpm > 0);
  memorySet(tpmKey, tpm + tokW, windowsMs[1], now, tpm > 0);
  memorySet(rpdKey, rpd + reqW, windowsMs[2], now, rpd > 0);
  memorySet(tpdKey, tpd + tokW, windowsMs[3], now, tpd > 0);
  return { ok: true };
}

export type QuotaReservation = {
  provider: AiProviderId;
  model: string | null;
  tokenWeight: number;
  priority: QuotaPriority;
};

export type QuotaCheckResult =
  | { allowed: true; provider: AiProviderId; model: string | null; reservation: QuotaReservation }
  | { allowed: false; scope: QuotaScope; provider: AiProviderId; model: string | null; reason: string };

/**
 * Atomically reserves budget across all four scopes for one request.
 * Breaking-priority requests may dip into the reserved fraction of the
 * daily (rpd/tpd) budget; normal/backfill requests are capped at
 * (1 - reserve fraction) of the daily limit.
 */
export async function reserveQuota(input: {
  provider: AiProviderId;
  model?: string | null;
  operation: string;
  priority?: QuotaPriority;
  estimatedTokens?: number;
}): Promise<QuotaCheckResult> {
  const model = input.model ?? null;
  const priority = input.priority ?? "normal";
  const limits = getProviderLimits(input.provider, model);
  const tokenWeight = Math.max(1, input.estimatedTokens ?? 1);

  if (limits.rpm <= 0 || limits.tpm <= 0 || limits.rpd <= 0 || limits.tpd <= 0) {
    return {
      allowed: false,
      scope: "rpd",
      provider: input.provider,
      model,
      reason: `${input.provider}${model ? `/${model}` : ""} disabled (limit=0)`,
    };
  }

  const reserveFraction = getBreakingNewsReserveFraction();
  const rpdLimit = priority === "breaking" ? limits.rpd : Math.floor(limits.rpd * (1 - reserveFraction));
  const tpdLimit = priority === "breaking" ? limits.tpd : Math.floor(limits.tpd * (1 - reserveFraction));

  const keys: [string, string, string, string] = [
    bucketKey(input.provider, model, "rpm"),
    bucketKey(input.provider, model, "tpm"),
    bucketKey(input.provider, model, "rpd"),
    bucketKey(input.provider, model, "tpd"),
  ];

  let result: { ok: true } | { ok: false; scope: QuotaScope };

  if (isRedisConfigured()) {
    const evalResult = await redisEval<[number, string]>(
      RESERVE_SCRIPT,
      keys,
      [1, tokenWeight, limits.rpm, limits.tpm, rpdLimit, tpdLimit, 60, 86_400]
    );
    if (evalResult === null) {
      // Redis reachable-but-erroring or unreachable mid-request — degrade to
      // the in-memory counter rather than fail the whole operation closed.
      result = reserveInMemory(keys, 1, tokenWeight, [limits.rpm, limits.tpm, rpdLimit, tpdLimit], [60_000, 60_000, 86_400_000, 86_400_000]);
    } else {
      result = evalResult[0] === 1 ? { ok: true } : { ok: false, scope: evalResult[1] as QuotaScope };
    }
  } else {
    result = reserveInMemory(keys, 1, tokenWeight, [limits.rpm, limits.tpm, rpdLimit, tpdLimit], [60_000, 60_000, 86_400_000, 86_400_000]);
  }

  if (!result.ok) {
    return {
      allowed: false,
      scope: result.scope,
      provider: input.provider,
      model,
      reason: `${input.provider}${model ? `/${model}` : ""} ${result.scope} exhausted (priority=${priority})`,
    };
  }

  return {
    allowed: true,
    provider: input.provider,
    model,
    reservation: { provider: input.provider, model, tokenWeight, priority },
  };
}

/**
 * Corrects tpm/tpd for the delta between the pre-request token estimate and
 * the provider's actual reported usage (0/0 for a request that failed
 * before any tokens were consumed, which effectively gives the estimate
 * back). Best-effort, fire-and-forget — never blocks or throws into the
 * caller's request path. rpm/rpd are NOT adjusted here: a request that was
 * sent still consumed a rate-limit slot on the provider's side regardless
 * of outcome.
 */
export async function reconcileQuotaUsage(
  reservation: QuotaReservation,
  actual: { inputTokens: number; outputTokens: number }
): Promise<void> {
  const actualTotal = Math.max(0, actual.inputTokens + actual.outputTokens);
  const delta = actualTotal - reservation.tokenWeight;
  if (delta === 0) return;

  const tpmKey = bucketKey(reservation.provider, reservation.model, "tpm");
  const tpdKey = bucketKey(reservation.provider, reservation.model, "tpd");

  try {
    if (isRedisConfigured()) {
      await Promise.all([redisIncrBy(tpmKey, delta), redisIncrBy(tpdKey, delta)]);
    } else {
      const now = Date.now();
      const tpm = memoryGet(tpmKey, now);
      const tpd = memoryGet(tpdKey, now);
      memorySet(tpmKey, Math.max(0, tpm + delta), 60_000, now, tpm > 0);
      memorySet(tpdKey, Math.max(0, tpd + delta), 86_400_000, now, tpd > 0);
    }
  } catch (err) {
    console.warn("[ai-quota] reconcile failed:", err instanceof Error ? err.message : err);
  }
}

// --- Read-only peek -----------------------------------------------------

export type QuotaSnapshot = {
  provider: AiProviderId;
  model: string | null;
  scope: QuotaScope;
  limit: number;
  used: number;
  remaining: number;
  windowStart: number;
  /** True when the underlying window state couldn't be read directly (no Redis, no prior state) and usage was assumed zero rather than fabricated. */
  estimated: boolean;
};

export async function peekQuota(
  provider: AiProviderId,
  scope: QuotaScope,
  model?: string | null
): Promise<QuotaSnapshot> {
  const limits = getProviderLimits(provider, model ?? null);
  const limit = limits[scope];
  const now = Date.now();

  if (limit <= 0) {
    return { provider, model: model ?? null, scope, limit, used: 0, remaining: 0, windowStart: now, estimated: false };
  }

  const key = bucketKey(provider, model ?? null, scope);
  const redisConfigured = isRedisConfigured();

  if (redisConfigured) {
    const raw = await redisGet(key);
    if (raw !== null) {
      const used = Number(raw);
      if (Number.isFinite(used)) {
        return { provider, model: model ?? null, scope, limit, used, remaining: Math.max(0, limit - used), windowStart: now, estimated: false };
      }
    }
  }

  const used = memoryGet(key, now);
  if (used > 0) {
    return { provider, model: model ?? null, scope, limit, used, remaining: Math.max(0, limit - used), windowStart: now, estimated: false };
  }

  return {
    provider,
    model: model ?? null,
    scope,
    limit,
    used: 0,
    remaining: limit,
    windowStart: now,
    estimated: !redisConfigured,
  };
}

// --- Legacy single-shot API (kept for callers with no token-weighted
// reconciliation needs — e.g. a fixed per-call cost). Internally just a
// reserve with no reconciliation step available. Prefer reserveQuota +
// reconcileQuotaUsage for anything where actual token cost varies.
export async function checkAndConsumeQuota(input: {
  provider: AiProviderId;
  model?: string | null;
  operation: string;
  priority?: QuotaPriority;
  estimatedTokens?: number;
}): Promise<{ allowed: boolean; reason?: string }> {
  const result = await reserveQuota(input);
  return result.allowed ? { allowed: true } : { allowed: false, reason: result.reason };
}

// --- Concurrency gate -----------------------------------------------------

const inFlight = new Map<AiProviderId, number>();

/**
 * Best-effort, process-local concurrency gate (mirrors the run-guard pattern
 * of degrading gracefully rather than hard-failing when it can't be exact
 * across serverless instances). Combined with the RPM reservation above,
 * this bounds burst size even if concurrency isn't perfectly enforced
 * cross-instance. Concurrency is tracked per-provider, not per-model — all
 * models on a provider share the same underlying connection budget.
 */
export function acquireConcurrencySlot(provider: AiProviderId): { acquired: boolean; release: () => void } {
  const limits = getProviderLimits(provider);
  const current = inFlight.get(provider) ?? 0;
  if (current >= limits.maxConcurrent) {
    return { acquired: false, release: () => {} };
  }
  inFlight.set(provider, current + 1);
  let released = false;
  return {
    acquired: true,
    release: () => {
      if (released) return;
      released = true;
      inFlight.set(provider, Math.max(0, (inFlight.get(provider) ?? 1) - 1));
    },
  };
}

export function getInFlightCount(provider: AiProviderId): number {
  return inFlight.get(provider) ?? 0;
}

// --- Cloudflare neuron accounting ------------------------------------------
//
// Cloudflare's free tier is a single shared daily *neuron* budget, not a
// generic token-day allowance — a 1024x1024/4-step image and a short
// embedding call cost wildly different amounts from the same pool, so this
// tracks neurons as its own scope, additive to (not a replacement for) the
// rpm/tpm/rpd/tpd reservation above.

/** Read at call time (not frozen at module load) so AI_QUOTA_CLOUDFLARE_NEURON_CAP can be overridden without a rebuild. */
export function getCloudflareDailyNeuronCap(): number {
  const raw = process.env.AI_QUOTA_CLOUDFLARE_NEURON_CAP;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10_000;
}

/** @cf/baai/bge-m3 neuron cost, per Cloudflare's published per-model pricing. */
const BGE_M3_NEURONS_PER_MILLION_INPUT_TOKENS = 1_075;
/** @cf/black-forest-labs/flux-1-schnell neuron cost, per Cloudflare's published per-model pricing. */
const FLUX_SCHNELL_NEURONS_PER_512_TILE = 4.8;
const FLUX_SCHNELL_NEURONS_PER_STEP = 9.6;

export type CloudflareNeuronEstimateInput =
  | { kind: "embedding"; inputTokens: number }
  | { kind: "image"; width: number; height: number; steps: number };

export function estimateCloudflareNeurons(input: CloudflareNeuronEstimateInput): number {
  if (input.kind === "embedding") {
    return (input.inputTokens / 1_000_000) * BGE_M3_NEURONS_PER_MILLION_INPUT_TOKENS;
  }
  const tiles = Math.ceil(input.width / 512) * Math.ceil(input.height / 512);
  return tiles * FLUX_SCHNELL_NEURONS_PER_512_TILE + input.steps * FLUX_SCHNELL_NEURONS_PER_STEP;
}

const NEURON_RESERVE_SCRIPT = `
local key = KEYS[1]
local weight = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local ttl = ARGV[3]
local used = tonumber(redis.call('GET', key) or '0')
if used + weight > limit then return {0, used} end
redis.call('INCRBYFLOAT', key, weight)
if used == 0 then redis.call('EXPIRE', key, ttl) end
return {1, used + weight}
`;

const NEURON_KEY = "ai-quota:cloudflare:neurons:daily";
let memoryNeuronsUsed = 0;
let memoryNeuronsResetAt = 0;

export type NeuronReserveResult = { allowed: boolean; used: number; remaining: number; cap: number; reason?: string };

/** Atomically reserves `estimatedNeurons` against the shared daily Cloudflare budget. */
export async function reserveCloudflareNeurons(
  estimatedNeurons: number,
  priority: QuotaPriority = "normal"
): Promise<NeuronReserveResult> {
  const dailyCap = getCloudflareDailyNeuronCap();
  const cap = priority === "breaking" ? dailyCap : Math.floor(dailyCap * (1 - getBreakingNewsReserveFraction()));

  if (isRedisConfigured()) {
    const result = await redisEval<[number, number]>(NEURON_RESERVE_SCRIPT, [NEURON_KEY], [estimatedNeurons, cap, 86_400]);
    if (result !== null) {
      const [ok, used] = result;
      return ok === 1
        ? { allowed: true, used, remaining: Math.max(0, dailyCap - used), cap }
        : { allowed: false, used, remaining: Math.max(0, dailyCap - used), cap, reason: `cloudflare daily neuron budget exhausted (priority=${priority})` };
    }
  }

  const now = Date.now();
  if (memoryNeuronsResetAt <= now) {
    memoryNeuronsUsed = 0;
    memoryNeuronsResetAt = now + 86_400_000;
  }
  if (memoryNeuronsUsed + estimatedNeurons > cap) {
    return { allowed: false, used: memoryNeuronsUsed, remaining: Math.max(0, dailyCap - memoryNeuronsUsed), cap, reason: `cloudflare daily neuron budget exhausted (priority=${priority})` };
  }
  memoryNeuronsUsed += estimatedNeurons;
  return { allowed: true, used: memoryNeuronsUsed, remaining: Math.max(0, dailyCap - memoryNeuronsUsed), cap };
}

/**
 * Adjusts the neuron counter for the delta between the pre-request estimate
 * and actual cost. Cloudflare's Workers AI response does not currently
 * report a real neuron count, so `actualNeurons` is the same estimate today
 * — this hook exists so that gap can be closed later (e.g. from AI Gateway
 * analytics) without changing every call site.
 */
export async function reconcileCloudflareNeurons(estimatedNeurons: number, actualNeurons: number): Promise<void> {
  const delta = actualNeurons - estimatedNeurons;
  if (delta === 0) return;
  try {
    if (isRedisConfigured()) {
      await redisIncrBy(NEURON_KEY, delta);
    } else {
      memoryNeuronsUsed = Math.max(0, memoryNeuronsUsed + delta);
    }
  } catch (err) {
    console.warn("[ai-quota] cloudflare neuron reconcile failed:", err instanceof Error ? err.message : err);
  }
}

export type CloudflareCapacityForecast = {
  usedToday: number;
  remaining: number;
  cap: number;
  /** Assumes a typical 1024x1024, 4-step image (57.6 neurons). */
  estimatedImagesRemaining: number;
  /** Assumes a typical ~500-token embedding call. */
  estimatedEmbeddingCallsRemaining: number;
};

const TYPICAL_IMAGE_NEURONS = estimateCloudflareNeurons({ kind: "image", width: 1024, height: 1024, steps: 4 });
const TYPICAL_EMBEDDING_NEURONS = estimateCloudflareNeurons({ kind: "embedding", inputTokens: 500 });

/** Test-only: resets the in-memory neuron counter (there is exactly one global bucket by design — Cloudflare's real free tier is a single shared daily pool, not something that can be namespaced per-test). */
export function __resetCloudflareNeuronsForTests(): void {
  memoryNeuronsUsed = 0;
  memoryNeuronsResetAt = 0;
}

export async function getCloudflareNeuronForecast(): Promise<CloudflareCapacityForecast> {
  let used = 0;
  if (isRedisConfigured()) {
    const raw = await redisGet(NEURON_KEY);
    used = raw ? Number(raw) : 0;
  } else {
    const now = Date.now();
    used = memoryNeuronsResetAt > now ? memoryNeuronsUsed : 0;
  }
  const dailyCap = getCloudflareDailyNeuronCap();
  const remaining = Math.max(0, dailyCap - used);
  return {
    usedToday: used,
    remaining,
    cap: dailyCap,
    estimatedImagesRemaining: Math.floor(remaining / TYPICAL_IMAGE_NEURONS),
    estimatedEmbeddingCallsRemaining: Math.floor(remaining / TYPICAL_EMBEDDING_NEURONS),
  };
}
