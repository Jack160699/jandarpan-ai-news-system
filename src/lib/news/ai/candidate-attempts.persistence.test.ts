import { beforeEach, describe, expect, it, vi } from "vitest";

/** In-memory stand-in for the editorial_candidate_attempts table + record_editorial_candidate_failure() (089). */
type Row = { event_id: string; attempts: number; next_retry_at: string | null; dead_lettered_at: string | null };
const table = new Map<string, Row>();
let rpcCalls = 0;
let failRpc = false;
let now = Date.parse("2026-09-30T10:00:00Z");

function rpcImpl(args: { p_event_id: string; p_max_attempts: number; p_base_seconds: number; p_max_seconds: number }) {
  rpcCalls++;
  if (failRpc) return { data: null, error: { message: "function does not exist" } };
  const prev = table.get(args.p_event_id);
  const attempts = (prev?.attempts ?? 0) + 1;
  const delay = Math.min(args.p_max_seconds, args.p_base_seconds * 2 ** Math.min(prev?.attempts ?? 0, 20));
  const row: Row = {
    event_id: args.p_event_id,
    attempts,
    next_retry_at: new Date(now + delay * 1000).toISOString(),
    dead_lettered_at: prev?.dead_lettered_at ?? (attempts >= args.p_max_attempts ? new Date(now).toISOString() : null),
  };
  table.set(args.p_event_id, row);
  return { data: [{ attempts, dead_lettered: row.dead_lettered_at !== null }], error: null };
}

vi.mock("@/lib/supabase", () => ({
  createAdminServerClient: () => ({
    rpc: (_name: string, args: never) => Promise.resolve(rpcImpl(args)),
    from: () => ({
      select: () => ({
        in: (_c: string, ids: string[]) =>
          Promise.resolve({ data: ids.map((id) => table.get(id)).filter(Boolean), error: null }),
      }),
      delete: () => ({
        in: (_c: string, ids: string[]) => {
          ids.forEach((id) => table.delete(id));
          return Promise.resolve({ error: null });
        },
      }),
    }),
  }),
}));

import {
  clearCandidateAttempts,
  isCandidateBlocked,
  loadCandidateAttemptStates,
  recordCandidateFailure,
} from "./candidate-attempts";

const EVENT = "0d8a5c0e-1b1f-4e0a-9c55-0123456789ab";

beforeEach(() => {
  table.clear();
  rpcCalls = 0;
  failRpc = false;
  now = Date.parse("2026-09-30T10:00:00Z");
});

describe("failed-candidate persistence (TS <-> SQL contract)", () => {
  it("first failure blocks the event for 15 minutes; it becomes eligible again afterwards, never immediately", async () => {
    const rec = await recordCandidateFailure(EVENT, "llm_generation_failed");
    expect(rec).toEqual({ attempts: 1, deadLettered: false });
    const st = (await loadCandidateAttemptStates([EVENT])).get(EVENT)!;
    expect(isCandidateBlocked(st, now)).toBe(true); // immediately after failing: blocked
    expect(isCandidateBlocked(st, now + 14 * 60_000)).toBe(true);
    expect(isCandidateBlocked(st, now + 15 * 60_000 + 1000)).toBe(false);
  });

  it("backoff doubles (15m, 30m, 60m) and the 4th failure dead-letters the event permanently", async () => {
    const gaps: number[] = [];
    let last!: { attempts: number; deadLettered: boolean };
    for (let i = 0; i < 4; i++) {
      last = (await recordCandidateFailure(EVENT, "quality_checks_failed"))!;
      const st = (await loadCandidateAttemptStates([EVENT])).get(EVENT)!;
      gaps.push(Math.round(((st.nextRetryAt ?? 0) - now) / 60_000));
    }
    expect(gaps.slice(0, 3)).toEqual([15, 30, 60]);
    expect(last).toEqual({ attempts: 4, deadLettered: true });
    const st = (await loadCandidateAttemptStates([EVENT])).get(EVENT)!;
    expect(isCandidateBlocked(st, now + 365 * 86_400_000)).toBe(true); // dead-letter never auto-retries
  });

  it("infrastructure/governor outcomes are never counted against the event", async () => {
    for (const reason of ["DEFERRED_QUOTA", "RUN_BUDGET_EXHAUSTED", "ai_provider_cooldown"]) {
      expect(await recordCandidateFailure(EVENT, reason)).toBeNull();
    }
    expect(rpcCalls).toBe(0);
    expect(table.size).toBe(0);
  });

  it("a published event's history is cleared", async () => {
    await recordCandidateFailure(EVENT, "llm_generation_failed");
    await clearCandidateAttempts([EVENT]);
    expect((await loadCandidateAttemptStates([EVENT])).size).toBe(0);
  });

  it("fails open: an absent table/RPC (migration 089 not applied) never stops generation", async () => {
    failRpc = true;
    expect(await recordCandidateFailure(EVENT, "llm_generation_failed")).toBeNull();
    expect((await loadCandidateAttemptStates([EVENT])).size).toBe(0);
  });
});
