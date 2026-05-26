/**
 * Promise timeout wrapper — prevents hung admin/auth initialization.
 */

export class TimeoutError extends Error {
  readonly timeoutMs: number;
  readonly label: string;

  constructor(label: string, timeoutMs: number) {
    super(`timeout:${label}:${timeoutMs}ms`);
    this.name = "TimeoutError";
    this.label = label;
    this.timeoutMs = timeoutMs;
  }
}

export type WithTimeoutOptions = {
  /** Default 8000ms */
  timeoutMs?: number;
  label?: string;
  /** Optional external abort (composes with timeout) */
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT_MS = 8_000;

export function isTimeoutError(err: unknown): err is TimeoutError {
  return err instanceof TimeoutError;
}

/**
 * Race `promise` against a timeout. Rejects with {@link TimeoutError} if time elapses.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: WithTimeoutOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const label = options.label ?? "operation";

  if (options.signal?.aborted) {
    throw new TimeoutError(label, timeoutMs);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, timeoutMs)), timeoutMs);
    options.signal?.addEventListener(
      "abort",
      () => reject(new TimeoutError(label, timeoutMs)),
      { once: true }
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Like {@link withTimeout} but returns `fallback` instead of throwing.
 */
export async function withTimeoutFallback<T>(
  promise: Promise<T>,
  fallback: T,
  options: WithTimeoutOptions = {}
): Promise<T> {
  try {
    return await withTimeout(promise, options);
  } catch (err) {
    if (isTimeoutError(err)) return fallback;
    throw err;
  }
}
