/**
 * Per-run LLM call budget.
 *
 * An editorial run can fan out (many candidates × generate + repair × provider failover). This scope caps the
 * number of REAL provider calls one run may make. It is an AsyncLocalStorage scope, so anything called inside
 * `withLlmCallBudget` — however deep — is counted, and code outside a scope is unaffected.
 *
 * Calls answered without touching the network (open circuit, own quota denial, concurrency slot busy) are
 * refunded, so only calls that actually reach a provider consume the budget. Running out of budget is a
 * governor decision, NOT a provider failure: it never opens a circuit.
 */

import { AsyncLocalStorage } from "node:async_hooks";

type Budget = { max: number; used: number };

const scope = new AsyncLocalStorage<Budget>();

/** Operations that count against the budget (the expensive editorial path). */
export const BUDGETED_OPERATIONS: ReadonlySet<string> = new Set([
  "editorial_generate",
  "editorial_repair",
  "editorial_review",
  "schema_repair",
]);

export const BUDGET_EXHAUSTED_CODE = "ai_run_budget_exhausted";

export function defaultRunCallBudget(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.EDITORIAL_MAX_LLM_CALLS_PER_RUN);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 12;
}

export async function withLlmCallBudget<T>(
  max: number,
  fn: () => Promise<T>
): Promise<{ value: T; used: number; max: number }> {
  const budget: Budget = { max: Math.max(1, Math.floor(max)), used: 0 };
  const value = await scope.run(budget, fn);
  return { value, used: budget.used, max: budget.max };
}

export function llmBudgetSnapshot(): { max: number; used: number; remaining: number } | null {
  const b = scope.getStore();
  return b ? { max: b.max, used: b.used, remaining: Math.max(0, b.max - b.used) } : null;
}

/** Reserve one call. Always true outside a budget scope or for non-budgeted operations. */
export function tryConsumeLlmCall(operation: string): boolean {
  const b = scope.getStore();
  if (!b || !BUDGETED_OPERATIONS.has(operation)) return true;
  if (b.used >= b.max) return false;
  b.used += 1;
  return true;
}

/** Give a reserved call back (the attempt never reached a provider). */
export function refundLlmCall(operation: string): void {
  const b = scope.getStore();
  if (!b || !BUDGETED_OPERATIONS.has(operation)) return;
  b.used = Math.max(0, b.used - 1);
}

export function isLlmBudgetExhausted(operation: string): boolean {
  const b = scope.getStore();
  return Boolean(b && BUDGETED_OPERATIONS.has(operation) && b.used >= b.max);
}

/** Result codes that mean "answered locally, no provider was called". */
export const NO_NETWORK_CALL_CODES: ReadonlySet<string> = new Set([
  "ai_provider_cooldown",
  "ai_quota_exhausted",
  "ai_provider_busy",
  "ai_unavailable",
]);
