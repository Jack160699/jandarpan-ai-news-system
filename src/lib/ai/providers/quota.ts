/**
 * Provider quota + rate controller. Built on the existing Redis sliding-window
 * primitive (src/lib/infrastructure/cache/rate-limit.ts), which already
 * degrades to an in-memory fallback when Redis isn't configured.
 *
 * Free-tier RPM/TPM/RPD/TPD limits below are conservative starting points —
 * verify against each provider's actual account dashboard before relying on
 * them, and adjust via the *_LIMIT env vars rather than editing this file.
 *
 * Hard rule: quota exhaustion is terminal for the current request. Callers
 * must not loop-retry on `allowed: false` — fall through to the next
 * provider in the chain (see router.ts) or fail the operation.
 */

import { checkRateLimit } from "@/lib/infrastructure/cache/rate-limit";
import { isRedisConfigured, redisGet } from "@/lib/infrastructure/cache/redis";
import { memoryCacheGet } from "@/lib/infrastructure/cache/memory";
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

const DEFAULT_LIMITS: Record<AiProviderId, ProviderLimits> = {
  gemini: { rpm: 14, tpm: 900_000, rpd: 1_400, tpd: 5_000_000, maxConcurrent: 2 },
  groq: { rpm: 28, tpm: 18_000, rpd: 13_000, tpd: 400_000, maxConcurrent: 2 },
  cloudflare: { rpm: 40, tpm: 2_000_000, rpd: 9_000, tpd: 20_000_000, maxConcurrent: 1 },
  openrouter: { rpm: 18, tpm: 200_000, rpd: 190, tpd: 2_000_000, maxConcurrent: 1 },
  openai: { rpm: 0, tpm: 0, rpd: 0, tpd: 0, maxConcurrent: 0 },
  local: { rpm: 100_000, tpm: 100_000_000, rpd: 100_000_000, tpd: 100_000_000, maxConcurrent: 100 },
};

/** Fraction of each provider's daily request budget held back for breaking news. */
const BREAKING_NEWS_RESERVE_FRACTION = Number(
  process.env.AI_QUOTA_BREAKING_RESERVE_FRACTION ?? 0.18
);

function envLimit(provider: AiProviderId, scope: QuotaScope, fallback: number): number {
  const key = `AI_QUOTA_${provider.toUpperCase()}_${scope.toUpperCase()}_LIMIT`;
  const raw = process.env[key];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getProviderLimits(provider: AiProviderId): ProviderLimits {
  const base = DEFAULT_LIMITS[provider];
  return {
    rpm: envLimit(provider, "rpm", base.rpm),
    tpm: envLimit(provider, "tpm", base.tpm),
    rpd: envLimit(provider, "rpd", base.rpd),
    tpd: envLimit(provider, "tpd", base.tpd),
    maxConcurrent: base.maxConcurrent,
  };
}

export type QuotaCheckResult = {
  allowed: boolean;
  scope: QuotaScope;
  provider: AiProviderId;
  limit: number;
  remaining: number;
  resetAt: number;
  reason?: string;
};

async function checkScope(
  provider: AiProviderId,
  scope: QuotaScope,
  limit: number,
  windowSec: number,
  cost: number
): Promise<QuotaCheckResult> {
  if (limit <= 0) {
    return {
      allowed: false,
      scope,
      provider,
      limit,
      remaining: 0,
      resetAt: Date.now(),
      reason: `${provider} ${scope} disabled (limit=0)`,
    };
  }
  // checkRateLimit counts calls, not arbitrary cost — call it `cost` times
  // worth of budget by checking against a pre-divided limit for token scopes.
  const effectiveLimit = scope === "tpm" || scope === "tpd" ? Math.floor(limit / Math.max(1, cost)) : limit;
  const result = await checkRateLimit({
    key: `ai-quota:${provider}:${scope}`,
    limit: effectiveLimit,
    windowSec,
  });
  return {
    allowed: result.allowed,
    scope,
    provider,
    limit,
    remaining: result.remaining,
    resetAt: result.resetAt,
    reason: result.allowed ? undefined : `${provider} ${scope} exhausted`,
  };
}

/**
 * Check + consume quota across all four scopes for one request. Returns the
 * first scope that failed (if any). Breaking-priority requests are allowed
 * to dip into the reserved fraction of the daily budget; normal/backfill
 * requests are blocked once usage crosses (1 - reserve fraction) of RPD.
 */
export async function checkAndConsumeQuota(input: {
  provider: AiProviderId;
  operation: string;
  priority?: QuotaPriority;
  estimatedTokens?: number;
}): Promise<QuotaCheckResult> {
  const limits = getProviderLimits(input.provider);
  const priority = input.priority ?? "normal";
  const tokenCost = Math.max(1, input.estimatedTokens ?? 1);

  const rpm = await checkScope(input.provider, "rpm", limits.rpm, 60, 1);
  if (!rpm.allowed) return rpm;

  const tpm = await checkScope(input.provider, "tpm", limits.tpm, 60, tokenCost);
  if (!tpm.allowed) return tpm;

  const rpdLimit =
    priority === "breaking"
      ? limits.rpd
      : Math.floor(limits.rpd * (1 - BREAKING_NEWS_RESERVE_FRACTION));
  const rpd = await checkScope(input.provider, "rpd", rpdLimit, 86_400, 1);
  if (!rpd.allowed) {
    return { ...rpd, reason: `${input.provider} rpd budget exhausted (priority=${priority})` };
  }

  const tpdLimit =
    priority === "breaking"
      ? limits.tpd
      : Math.floor(limits.tpd * (1 - BREAKING_NEWS_RESERVE_FRACTION));
  const tpd = await checkScope(input.provider, "tpd", tpdLimit, 86_400, tokenCost);
  if (!tpd.allowed) {
    return { ...tpd, reason: `${input.provider} tpd budget exhausted (priority=${priority})` };
  }

  return tpd;
}

export type QuotaSnapshot = {
  provider: AiProviderId;
  scope: QuotaScope;
  limit: number;
  used: number;
  remaining: number;
  /** Epoch ms — start of the current sliding window. */
  windowStart: number;
  /**
   * True when the underlying window state could not be read directly (no
   * Redis configured) and usage was assumed zero for this window rather
   * than fabricated — see doc comment on peekQuota.
   */
  estimated: boolean;
};

/**
 * Read-only peek at a provider/scope's current quota window — unlike
 * checkAndConsumeQuota, this never consumes a slot. Mirrors rate-limit.ts's
 * key convention (`rl:ai-quota:<provider>:<scope>`) and its Redis-mirrored-
 * into-memoryCache pattern so a peek can be served without touching
 * checkRateLimit's write path.
 *
 * Caveat: when Redis is not configured, checkAndConsumeQuota's sliding
 * window lives in a process-private Map inside rate-limit.ts that isn't
 * exported. This function cannot see that state in-process and reports the
 * window as fresh (used=0, estimated=true) rather than fabricating a
 * number — callers (e.g. the provider-quota-snapshot cron) should treat
 * `estimated: true` rows as low-confidence.
 */
export async function peekQuota(
  provider: AiProviderId,
  scope: QuotaScope
): Promise<QuotaSnapshot> {
  const limits = getProviderLimits(provider);
  const limit = limits[scope];
  const windowSec = scope === "rpm" || scope === "tpm" ? 60 : 86_400;
  const now = Date.now();

  if (limit <= 0) {
    return { provider, scope, limit, used: 0, remaining: 0, windowStart: now, estimated: false };
  }

  const redisKey = `rl:ai-quota:${provider}:${scope}`;
  const redisConfigured = isRedisConfigured();
  let raw = memoryCacheGet(redisKey);
  if (!raw && redisConfigured) {
    raw = await redisGet(redisKey);
  }

  if (!raw) {
    return {
      provider,
      scope,
      limit,
      used: 0,
      remaining: limit,
      windowStart: now,
      estimated: !redisConfigured,
    };
  }

  try {
    const state = JSON.parse(raw) as { count: number; resetAt: number };
    if (state.resetAt <= now) {
      return {
        provider,
        scope,
        limit,
        used: 0,
        remaining: limit,
        windowStart: now,
        estimated: !redisConfigured,
      };
    }
    const used = Math.min(state.count, limit);
    return {
      provider,
      scope,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      windowStart: state.resetAt - windowSec * 1000,
      estimated: !redisConfigured,
    };
  } catch {
    return { provider, scope, limit, used: 0, remaining: limit, windowStart: now, estimated: true };
  }
}

// --- Concurrency gate -------------------------------------------------

const inFlight = new Map<AiProviderId, number>();

/**
 * Best-effort, process-local concurrency gate (mirrors the run-guard pattern
 * of degrading gracefully rather than hard-failing when it can't be exact
 * across serverless instances). Combined with per-provider RPM limits above,
 * this bounds burst size even if concurrency isn't perfectly enforced
 * cross-instance.
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
