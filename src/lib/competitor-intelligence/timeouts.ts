/**
 * Per-domain / per-page timeout helpers for competitor crawls.
 */

export class CompetitorTimeoutError extends Error {
  readonly timedOut = true as const;
  constructor(
    message: string,
    readonly scope: "domain" | "page" | "run"
  ) {
    super(message);
    this.name = "CompetitorTimeoutError";
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  scope: "domain" | "page" | "run",
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new CompetitorTimeoutError(
              `${scope}_timeout_${timeoutMs}ms:${label}`,
              scope
            )
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isCompetitorTimeoutError(
  err: unknown
): err is CompetitorTimeoutError {
  return (
    err instanceof CompetitorTimeoutError ||
    (typeof err === "object" &&
      err !== null &&
      "timedOut" in err &&
      (err as { timedOut?: boolean }).timedOut === true)
  );
}

export function remainingBudgetMs(startedAt: number, budgetMs: number): number {
  return Math.max(0, budgetMs - (Date.now() - startedAt));
}

export function hasRunBudget(
  startedAt: number,
  budgetMs: number,
  reserveMs = 5_000
): boolean {
  return remainingBudgetMs(startedAt, budgetMs) > reserveMs;
}
