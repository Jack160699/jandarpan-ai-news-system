/**
 * Supabase Edge implementation of src/lib/observability/sentry.ts (swapped in at bundle time, like the other
 * runtime ports). @sentry/nextjs is Next-specific (filesystem, child_process, webpack hooks) and cannot run in an Edge
 * Function, so Edge workers report errors to the function logs - which the platform already captures - instead.
 * The exported surface is identical to sentry.ts so call sites need no change.
 */

export function isSentryEnabled(): boolean {
  return false;
}

export function getSentryRelease(): string | undefined {
  return undefined;
}

export async function initSentryServer(): Promise<void> {}

export async function captureSentryTestEvent(_context?: Record<string, unknown>): Promise<boolean> {
  return false;
}

export async function captureOpsException(error: unknown, context?: Record<string, unknown>): Promise<void> {
  try {
    console.error(
      "[ops-exception]",
      JSON.stringify({ message: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300), context })
    );
  } catch {
    /* never throw from error reporting */
  }
}

export function sentryReadyState(): boolean {
  return false;
}
