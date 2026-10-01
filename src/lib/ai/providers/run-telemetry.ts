/**
 * Per-run provider telemetry.
 *
 * Every provider call already produces an AiProviderUsageRecord (tokens, model, latency, success). Inside a
 * `withRunTelemetry` scope those records are also collected in memory, so a worker can report exactly which
 * provider/model answered, how many calls were made, their latency and token use - without a DB round-trip and
 * without threading a recorder through the generation code. Outside a scope this is a no-op.
 *
 * Only metadata is kept - never prompts, completions or credentials.
 */

import { AsyncLocalStorage } from "node:async_hooks";

export type ProviderCallSummary = {
  provider: string;
  model: string;
  operation: string;
  endpoint: string;
  success: boolean;
  latencyMs: number | null;
  inputTokens: number;
  outputTokens: number;
  /** Error code from the provider adapter when the call failed. */
  errorCode: string | null;
};

const scope = new AsyncLocalStorage<ProviderCallSummary[]>();

export async function withRunTelemetry<T>(
  fn: () => Promise<T>
): Promise<{ value: T; calls: ProviderCallSummary[] }> {
  const calls: ProviderCallSummary[] = [];
  const value = await scope.run(calls, fn);
  return { value, calls };
}

export function noteProviderCall(call: ProviderCallSummary): void {
  scope.getStore()?.push(call);
}

export type RunTelemetryTotals = {
  calls: number;
  succeeded: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  latencyMsTotal: number;
  providers: string[];
  models: string[];
};

export function summarizeProviderCalls(calls: readonly ProviderCallSummary[]): RunTelemetryTotals {
  return {
    calls: calls.length,
    succeeded: calls.filter((c) => c.success).length,
    failed: calls.filter((c) => !c.success).length,
    inputTokens: calls.reduce((n, c) => n + c.inputTokens, 0),
    outputTokens: calls.reduce((n, c) => n + c.outputTokens, 0),
    latencyMsTotal: calls.reduce((n, c) => n + (c.latencyMs ?? 0), 0),
    providers: [...new Set(calls.map((c) => c.provider))],
    models: [...new Set(calls.map((c) => c.model))],
  };
}
