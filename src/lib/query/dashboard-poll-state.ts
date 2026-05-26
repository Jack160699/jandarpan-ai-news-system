/**
 * Shared dashboard poll gating: visibility, idle, route activity.
 */

const IDLE_MS = 5 * 60_000;

let lastActivityAt =
  typeof performance !== "undefined" ? performance.now() : Date.now();
let listenersAttached = false;

function bumpActivity(): void {
  lastActivityAt = Date.now();
}

function ensureActivityListeners(): void {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  const opts: AddEventListenerOptions = { passive: true };
  window.addEventListener("pointerdown", bumpActivity, opts);
  window.addEventListener("keydown", bumpActivity, opts);
  window.addEventListener("scroll", bumpActivity, opts);
}

export function isAdminUserIdle(): boolean {
  ensureActivityListeners();
  return Date.now() - lastActivityAt > IDLE_MS;
}

/** Routes that should not run background dashboard polling */
export function isDashboardPollRoute(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/admin/login")) return false;
  if (/^\/admin\/editor\/[^/]+/.test(pathname)) return false;
  return true;
}

export function isDocumentHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}

const LIVE_POLL =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_ADMIN_LIVE_POLL === "1";

const ENV_POLL_MS = Number(process.env.NEXT_PUBLIC_ADMIN_POLL_MS);

/** Default 3 min; live-critical mode allows 60s; clamp to 2–5 min unless live */
export function getDashboardPollIntervalMs(): number {
  if (LIVE_POLL) {
    const live = ENV_POLL_MS > 0 ? ENV_POLL_MS : 60_000;
    return Math.max(60_000, live);
  }
  const fallback = 180_000;
  const raw = ENV_POLL_MS > 0 ? ENV_POLL_MS : fallback;
  return Math.min(300_000, Math.max(120_000, raw));
}

export const DASHBOARD_STALE_MS = 60_000;
export const DASHBOARD_GC_MS = 10 * 60_000;
export const DASHBOARD_MIN_NETWORK_GAP_MS = 5_000;
