/**
 * Serverless execution budget — stop before Vercel hard timeout
 */

const DEFAULT_BUDGET_MS = 55_000;
const HOBBY_BUDGET_MS = 9_000;

export type ExecutionDeadline = {
  startedAt: number;
  maxDurationMs: number;
  elapsedMs: () => number;
  shouldStop: () => boolean;
  timedOutSafely: boolean;
  markTimedOut: () => void;
};

function resolveBudgetMs(): number {
  const explicit = Number(process.env.INGEST_BUDGET_MS);
  if (explicit > 0) return explicit;

  if (process.env.VERCEL === "1") {
    const plan = process.env.VERCEL_ENV;
    if (plan && process.env.VERCEL_ACCOUNT_LEVEL === "hobby") {
      return HOBBY_BUDGET_MS;
    }
    return HOBBY_BUDGET_MS;
  }

  return DEFAULT_BUDGET_MS;
}

export function createExecutionDeadline(
  maxDurationMs?: number
): ExecutionDeadline {
  const startedAt = Date.now();
  const budget = maxDurationMs ?? resolveBudgetMs();
  const stopAt = Math.floor(budget * 0.8);

  const state = { timedOutSafely: false };

  const deadline: ExecutionDeadline = {
    startedAt,
    maxDurationMs: budget,
    timedOutSafely: false,
    elapsedMs: () => Date.now() - startedAt,
    shouldStop: () => {
      if (state.timedOutSafely) return true;
      if (Date.now() - startedAt >= stopAt) {
        state.timedOutSafely = true;
        deadline.timedOutSafely = true;
        return true;
      }
      return false;
    },
    markTimedOut: () => {
      state.timedOutSafely = true;
      deadline.timedOutSafely = true;
    },
  };

  return deadline;
}
