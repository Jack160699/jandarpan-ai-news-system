/**
 * Shared Admin V3 client polling policy (shell status + notifications).
 */

export const ADMIN_POLL = {
  /** Healthy / quiet shell */
  statusIntervalMs: 60_000,
  notificationsIntervalMs: 60_000,
  /** Faster when canonical state is degraded/critical or unread critical exists */
  statusIntervalHotMs: 30_000,
  notificationsIntervalHotMs: 30_000,
  /** Client cache — do not refetch on popover open if fresher than this */
  clientStaleMs: 45_000,
  /** Exponential backoff after errors */
  errorBackoffInitialMs: 5_000,
  errorBackoffMaxMs: 120_000,
  jitterRatio: 0.15,
} as const;

export function withJitter(ms: number, ratio: number = ADMIN_POLL.jitterRatio): number {
  const delta = ms * ratio;
  return Math.round(ms - delta + Math.random() * 2 * delta);
}

export function nextBackoffMs(attempt: number): number {
  const base = ADMIN_POLL.errorBackoffInitialMs * 2 ** Math.max(0, attempt - 1);
  return withJitter(Math.min(base, ADMIN_POLL.errorBackoffMaxMs));
}

export function isDocumentHidden(): boolean {
  if (typeof document === "undefined") return false;
  return document.visibilityState === "hidden";
}

export function statusIntervalForState(state: string | null | undefined): number {
  if (state === "critical" || state === "degraded") {
    return withJitter(ADMIN_POLL.statusIntervalHotMs);
  }
  return withJitter(ADMIN_POLL.statusIntervalMs);
}

export function notificationsIntervalForTone(
  tone: string | null | undefined
): number {
  if (tone === "critical" || tone === "warning") {
    return withJitter(ADMIN_POLL.notificationsIntervalHotMs);
  }
  return withJitter(ADMIN_POLL.notificationsIntervalMs);
}
