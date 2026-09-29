/**
 * Persistence for the AI provider circuit breaker (table ai_provider_circuit).
 * Server-only; uses the service-role client. All functions are best-effort —
 * callers already swallow failures so persistence can never break generation.
 */

import { createAdminServerClient } from "@/lib/supabase";
import type { PersistedProviderState } from "@/lib/ai/providers/health";

const TABLE = "ai_provider_circuit";

type CircuitRow = {
  key: string;
  disabled_until: string | null;
  consecutive_failures: number;
  last_error: string | null;
  last_failure_at: string | null;
  last_success_at: string | null;
  failure_class: string | null;
  updated_at: string;
};

const iso = (ms: number | null): string | null =>
  ms === null ? null : new Date(ms).toISOString();
const ms = (v: string | null): number | null => (v ? new Date(v).getTime() : null);

export async function writeCircuitState(state: PersistedProviderState): Promise<void> {
  const supabase = createAdminServerClient();
  await supabase.from(TABLE as never).upsert(
    {
      key: state.key,
      disabled_until: iso(state.disabledUntil),
      consecutive_failures: state.consecutiveFailures,
      last_error: state.lastError,
      last_failure_at: iso(state.lastFailureAt),
      last_success_at: iso(state.lastSuccessAt),
      failure_class: state.failureClass ?? null,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "key" }
  );
}

export async function readCircuitStates(): Promise<PersistedProviderState[]> {
  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from(TABLE as never)
    .select(
      "key,disabled_until,consecutive_failures,last_error,last_failure_at,last_success_at,failure_class,updated_at"
    )
    // Only rows that can still matter: open circuits or ones failing recently.
    .or(
      `disabled_until.gt.${new Date().toISOString()},last_failure_at.gt.${new Date(
        Date.now() - 6 * 3_600_000
      ).toISOString()}`
    );
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as CircuitRow[]).map((r) => ({
    key: r.key,
    disabledUntil: ms(r.disabled_until),
    consecutiveFailures: r.consecutive_failures,
    lastError: r.last_error,
    lastFailureAt: ms(r.last_failure_at),
    lastSuccessAt: ms(r.last_success_at),
    failureClass: r.failure_class,
  }));
}

/** Admin view: every circuit row, newest first. */
export async function listCircuitStates(): Promise<CircuitRow[]> {
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from(TABLE as never)
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as CircuitRow[];
}
