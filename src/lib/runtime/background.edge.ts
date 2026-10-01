/**
 * Supabase Edge (Deno) implementation of the background-task port. See background.ts.
 *
 * There is no request-scoped `after()` here: tasks are tracked in a set and the worker awaits `drainBackground()`
 * before it finalises the run, so usage/circuit writes land inside the invocation's wall-clock budget. When the
 * platform exposes `EdgeRuntime.waitUntil`, each task is also registered with it as a second safety net.
 */

const pending = new Set<Promise<unknown>>();

type EdgeRuntimeLike = { waitUntil?: (p: Promise<unknown>) => void };

export function runInBackground(task: () => unknown): void {
  const p: Promise<unknown> = Promise.resolve()
    .then(task)
    .catch(() => undefined)
    .finally(() => {
      pending.delete(p);
    });
  pending.add(p);
  try {
    (globalThis as { EdgeRuntime?: EdgeRuntimeLike }).EdgeRuntime?.waitUntil?.(p);
  } catch {
    /* waitUntil unavailable outside a request - the drain below still covers it */
  }
}

/** Wait for tracked tasks (bounded, so a hung write can never consume the whole invocation). */
export async function drainBackground(timeoutMs = 5_000): Promise<void> {
  if (pending.size === 0) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  try {
    await Promise.race([Promise.allSettled([...pending]).then(() => undefined), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
