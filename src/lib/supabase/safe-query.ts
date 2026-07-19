/**
 * Resilient Supabase query helpers — retries, timeouts, schema mismatch fallbacks.
 */

import type { PostgrestError } from "@supabase/supabase-js";
import { createLogger } from "@/lib/observability/logger";
import { isPostgrestSchemaError } from "@/lib/newsroom-auth/schema-errors";

const log = createLogger("supabase-safe-query");

export type SafeQueryError = {
  code: "timeout" | "schema_mismatch" | "query_failed" | "unknown";
  message: string;
  postgrest?: PostgrestError | null;
};

export type SafeQueryResult<T> =
  | { ok: true; data: T; attempts: number; durationMs: number }
  | { ok: false; error: SafeQueryError; attempts: number; durationMs: number };

export type SafeQueryOptions = {
  label?: string;
  retries?: number;
  timeoutMs?: number;
  /** When schema cache lags, run this fallback instead of failing */
  onSchemaMismatch?: () => Promise<{ data: unknown; error: PostgrestError | null }>;
};

const DEFAULT_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 12_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyError(
  message: string,
  postgrest: PostgrestError | null
): SafeQueryError["code"] {
  if (isPostgrestSchemaError(message)) return "schema_mismatch";
  // PostgreSQL 57014 = statement_timeout (canceling statement due to statement timeout)
  if (
    postgrest?.code === "57014" ||
    /timeout|aborted|57014|canceling statement/i.test(message)
  ) {
    return "timeout";
  }
  if (postgrest?.code) return "query_failed";
  return "unknown";
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`query_timeout_${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Execute a Supabase query with retry, timeout, and optional schema fallback.
 */
export async function safeQuery<T>(
  run: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: SafeQueryOptions = {}
): Promise<SafeQueryResult<T>> {
  const label = options.label ?? "query";
  const retries = options.retries ?? DEFAULT_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = Date.now();
  let attempts = 0;
  let lastError: PostgrestError | null = null;
  let lastMessage = "unknown_error";

  while (attempts <= retries) {
    attempts += 1;
    try {
      const result = await withTimeout(run(), timeoutMs);
      if (!result.error) {
        const durationMs = Date.now() - startedAt;
        log.debug("query_ok", { label, attempts, durationMs });
        return {
          ok: true,
          data: (result.data ?? null) as T,
          attempts,
          durationMs,
        };
      }

      lastError = result.error;
      lastMessage = result.error.message;

      if (
        isPostgrestSchemaError(lastMessage) &&
        options.onSchemaMismatch
      ) {
        log.warn("schema_mismatch_fallback", { label, message: lastMessage });
        const fallback = await options.onSchemaMismatch();
        if (!fallback.error) {
          return {
            ok: true,
            data: (fallback.data ?? null) as T,
            attempts,
            durationMs: Date.now() - startedAt,
          };
        }
        lastError = fallback.error;
        lastMessage = fallback.error.message;
      }

      if (!isPostgrestSchemaError(lastMessage) && attempts <= retries) {
        await sleep(200 * attempts);
        continue;
      }

      break;
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : String(err);
      if (attempts <= retries) {
        await sleep(200 * attempts);
        continue;
      }
      break;
    }
  }

  const durationMs = Date.now() - startedAt;
  const code = classifyError(lastMessage, lastError);
  log.error("query_failed", {
    label,
    attempts,
    durationMs,
    code,
    err: lastMessage,
  });

  return {
    ok: false,
    error: {
      code,
      message: lastMessage,
      postgrest: lastError,
    },
    attempts,
    durationMs,
  };
}
