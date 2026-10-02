/**
 * Egress safety governor for the RECURRING workers (fetch / cluster / editorial / translation).
 *
 * Purpose: stop scheduled work BEFORE the monthly Supabase egress allowance is spent, so the project is never cut off with a 402.
 * It only ever REMOVES work. It never retries, never routes around a restriction, and never changes what a worker decides about a
 * story. It is OFF by default and has zero effect (and zero Redis traffic) until JD_EGRESS_GOVERNOR is set.
 *
 * Inputs
 *   - the egress meter (JD_EGRESS_METER=true): decoded response bytes of every Supabase request the worker made in a run
 *   - a durable monthly counter in Redis, one key per billing cycle, incremented once per run (atomic, TTL-safe)
 * Configuration (all optional; defaults are deliberately conservative)
 *   JD_EGRESS_GOVERNOR             off (default) | observe (compute + report, never blocks) | enforce (blocks at the stop threshold)
 *   JD_EGRESS_MONTHLY_BUDGET_BYTES total allowance being protected            default 5,000,000,000
 *   JD_EGRESS_SITE_RESERVE_BYTES   held back for readers/crawlers/admin (not metered here)   default 1,500,000,000
 *   JD_EGRESS_WARN_RATIO / _STOP_RATIO  fractions of (budget - reserve): default 0.60 / 0.80
 *   JD_EGRESS_CYCLE_ANCHOR_DAY     UTC day of month (1-28) the billing cycle starts on. DEFAULT 1 IS A PLACEHOLDER -- set it from the
 *                                  Supabase dashboard billing period; this code does not know the real reset date.
 * Failure policy (enforce): anything that prevents a trustworthy decision -- meter off, Redis missing/unreadable, invalid config --
 * is treated as STOP. (observe and off never block.)
 */

import { isRedisConfigured, redisEval } from "@/lib/infrastructure/cache/redis";
import { egressMeterEnabled, snapshotEgress, type EgressSnapshot } from "@/lib/observability/egress-meter";

export type GovernorMode = "off" | "observe" | "enforce";
export type GovernorState = "disabled" | "ok" | "warn" | "stop" | "unknown";

export type GovernorConfig = {
  mode: GovernorMode;
  budgetBytes: number;
  siteReserveBytes: number;
  warnRatio: number;
  stopRatio: number;
  anchorDay: number;
  /** false when an env value was present but unusable (defaults were substituted, or enforce must fail closed) */
  valid: boolean;
  problems: string[];
};

export const GOVERNOR_DEFAULTS = {
  budgetBytes: 5_000_000_000,
  siteReserveBytes: 1_500_000_000,
  warnRatio: 0.6,
  stopRatio: 0.8,
  anchorDay: 1,
} as const;

const COUNTER_TTL_SECONDS = 45 * 86_400;

type Env = Record<string, string | undefined>;

function num(env: Env, name: string, fallback: number, ok: (n: number) => boolean, problems: string[]): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !ok(n)) {
    problems.push(`${name}_invalid`);
    return fallback;
  }
  return n;
}

export function readGovernorConfig(env: Env = process.env): GovernorConfig {
  const problems: string[] = [];
  const rawMode = env.JD_EGRESS_GOVERNOR?.trim().toLowerCase();
  // Only the two exact words turn it on; anything else (including typos) is OFF so a typo can never start blocking production.
  const mode: GovernorMode = rawMode === "enforce" ? "enforce" : rawMode === "observe" ? "observe" : "off";
  if (rawMode && rawMode !== "off" && rawMode !== "observe" && rawMode !== "enforce") problems.push("JD_EGRESS_GOVERNOR_unrecognised");

  const budgetBytes = num(env, "JD_EGRESS_MONTHLY_BUDGET_BYTES", GOVERNOR_DEFAULTS.budgetBytes, (n) => n > 0, problems);
  const siteReserveBytes = num(env, "JD_EGRESS_SITE_RESERVE_BYTES", GOVERNOR_DEFAULTS.siteReserveBytes, (n) => n >= 0, problems);
  const warnRatio = num(env, "JD_EGRESS_WARN_RATIO", GOVERNOR_DEFAULTS.warnRatio, (n) => n > 0 && n < 1, problems);
  const stopRatio = num(env, "JD_EGRESS_STOP_RATIO", GOVERNOR_DEFAULTS.stopRatio, (n) => n > 0 && n <= 1, problems);
  const anchorDay = Math.floor(num(env, "JD_EGRESS_CYCLE_ANCHOR_DAY", GOVERNOR_DEFAULTS.anchorDay, (n) => n >= 1 && n <= 28, problems));
  if (warnRatio >= stopRatio) problems.push("warn_ratio_must_be_below_stop_ratio");
  if (siteReserveBytes >= budgetBytes) problems.push("site_reserve_must_be_below_budget");
  return { mode, budgetBytes, siteReserveBytes, warnRatio, stopRatio, anchorDay, valid: problems.length === 0, problems };
}

// ---- billing cycle (UTC) ------------------------------------------------------------------------------------------------------

export function cycleStartUtc(now: Date, anchorDay: number): Date {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const thisMonth = Date.UTC(y, m, anchorDay);
  return new Date(now.getTime() >= thisMonth ? thisMonth : Date.UTC(y, m - 1, anchorDay));
}

export function cycleEndUtc(now: Date, anchorDay: number): Date {
  const start = cycleStartUtc(now, anchorDay);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, anchorDay));
}

/** One counter per cycle: a new cycle starts a new key, so "reset" needs no job and cannot be missed. */
export function cycleKey(now: Date, anchorDay: number): string {
  return `jd:egress:cycle:${cycleStartUtc(now, anchorDay).toISOString().slice(0, 10)}`;
}

// ---- thresholds ---------------------------------------------------------------------------------------------------------------

export type Thresholds = { workerBudgetBytes: number; warnAtBytes: number; stopAtBytes: number };

export function thresholdsFor(cfg: Pick<GovernorConfig, "budgetBytes" | "siteReserveBytes" | "warnRatio" | "stopRatio">): Thresholds {
  const workerBudgetBytes = Math.max(0, cfg.budgetBytes - cfg.siteReserveBytes);
  return {
    workerBudgetBytes,
    warnAtBytes: Math.floor(workerBudgetBytes * cfg.warnRatio),
    stopAtBytes: Math.floor(workerBudgetBytes * cfg.stopRatio),
  };
}

export function stateForUsage(usedBytes: number, t: Thresholds): "ok" | "warn" | "stop" {
  if (usedBytes >= t.stopAtBytes) return "stop";
  if (usedBytes >= t.warnAtBytes) return "warn";
  return "ok";
}

// ---- durable counter ----------------------------------------------------------------------------------------------------------

const INCR_SCRIPT =
  "local v = redis.call('INCRBY', KEYS[1], ARGV[1]); if redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end; return v";
const READ_SCRIPT = "local v = redis.call('GET', KEYS[1]); if v then return tonumber(v) else return 0 end";

/** Bytes counted this cycle, or null when Redis could not be read (null is NOT zero: callers must fail closed). */
export async function readCycleBytes(now: Date, anchorDay: number): Promise<number | null> {
  if (!isRedisConfigured()) return null;
  const v = await redisEval<number>(READ_SCRIPT, [cycleKey(now, anchorDay)], []);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function addCycleBytes(bytes: number, now: Date, anchorDay: number): Promise<number | null> {
  if (!isRedisConfigured() || !(bytes > 0)) return null;
  const v = await redisEval<number>(INCR_SCRIPT, [cycleKey(now, anchorDay)], [Math.round(bytes), COUNTER_TTL_SECONDS]);
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ---- decision -----------------------------------------------------------------------------------------------------------------

export type GovernorDecision = {
  mode: GovernorMode;
  state: GovernorState;
  /** false only in enforce mode at/over the stop threshold or when a trustworthy decision is impossible */
  allow: boolean;
  reason: string | null;
  usedBytes: number | null;
  thresholds: Thresholds;
  cycleStart: string;
  cycleEnd: string;
  anchorDayIsPlaceholder: boolean;
  meterEnabled: boolean;
  configProblems: string[];
};

export async function evaluateEgressGovernor(opts: { env?: Env; now?: Date } = {}): Promise<GovernorDecision> {
  const env = opts.env ?? process.env;
  const now = opts.now ?? new Date();
  const cfg = readGovernorConfig(env);
  const thresholds = thresholdsFor(cfg);
  const base = {
    mode: cfg.mode,
    thresholds,
    cycleStart: cycleStartUtc(now, cfg.anchorDay).toISOString(),
    cycleEnd: cycleEndUtc(now, cfg.anchorDay).toISOString(),
    anchorDayIsPlaceholder: !env.JD_EGRESS_CYCLE_ANCHOR_DAY?.trim(),
    meterEnabled: egressMeterEnabled(env),
    configProblems: cfg.problems,
  };

  // OFF: no Redis, no meter read, nothing -- the governor cannot affect production until it is switched on.
  if (cfg.mode === "off") return { ...base, state: "disabled", allow: true, reason: null, usedBytes: null };

  const enforce = cfg.mode === "enforce";
  const unknown = (reason: string, usedBytes: number | null = null): GovernorDecision => ({
    ...base,
    state: "unknown",
    allow: !enforce, // fail closed only when enforcing
    reason,
    usedBytes,
  });

  if (!cfg.valid) return unknown(`invalid_config:${cfg.problems.join(",")}`);
  if (!base.meterEnabled) return unknown("meter_disabled");
  if (!isRedisConfigured()) return unknown("redis_not_configured");
  const used = await readCycleBytes(now, cfg.anchorDay);
  if (used === null) return unknown("counter_unreadable");

  const state = stateForUsage(used, thresholds);
  return {
    ...base,
    state,
    allow: !(enforce && state === "stop"),
    reason: state === "stop" ? "egress_budget_stop" : state === "warn" ? "egress_budget_warn" : null,
    usedBytes: used,
  };
}

/**
 * Adds this run's metered bytes to the durable counter. Call once per run, after the work. A failed write is reported (never thrown)
 * so it shows up in the run metadata; the next evaluation reads whatever the counter holds.
 */
export async function recordRunEgress(opts: { env?: Env; now?: Date; snapshot?: EgressSnapshot } = {}): Promise<{ recorded: boolean; bytes: number; total: number | null; reason?: string }> {
  const env = opts.env ?? process.env;
  const cfg = readGovernorConfig(env);
  const snap = opts.snapshot ?? snapshotEgress();
  if (cfg.mode === "off") return { recorded: false, bytes: snap.bytes, total: null, reason: "governor_off" };
  if (!egressMeterEnabled(env)) return { recorded: false, bytes: 0, total: null, reason: "meter_disabled" };
  if (!(snap.bytes > 0)) return { recorded: false, bytes: 0, total: null, reason: "no_bytes" };
  const total = await addCycleBytes(snap.bytes, opts.now ?? new Date(), cfg.anchorDay);
  return total === null ? { recorded: false, bytes: snap.bytes, total: null, reason: "write_failed" } : { recorded: true, bytes: snap.bytes, total };
}

// ---- admin diagnostics --------------------------------------------------------------------------------------------------------

export type GovernorSnapshot = {
  config: Omit<GovernorConfig, "problems"> & { problems: string[] };
  decision: GovernorDecision;
  counterKey: string;
  processMeter: EgressSnapshot;
  notes: string[];
};

export async function getEgressGovernorSnapshot(opts: { env?: Env; now?: Date } = {}): Promise<GovernorSnapshot> {
  const env = opts.env ?? process.env;
  const now = opts.now ?? new Date();
  const config = readGovernorConfig(env);
  const decision = await evaluateEgressGovernor({ env, now });
  const notes: string[] = [];
  if (decision.anchorDayIsPlaceholder) notes.push("JD_EGRESS_CYCLE_ANCHOR_DAY is not set: the cycle start is a PLACEHOLDER (day 1), not the real Supabase billing date.");
  if (config.mode === "off") notes.push("Governor is OFF: it has no effect on production.");
  if (config.mode === "observe") notes.push("Governor is in OBSERVE mode: it reports but never blocks.");
  notes.push("The counter covers the recurring workers only; reader/crawler traffic is covered by JD_EGRESS_SITE_RESERVE_BYTES, not measured here.");
  return { config, decision, counterKey: cycleKey(now, config.anchorDay), processMeter: snapshotEgress(), notes };
}
