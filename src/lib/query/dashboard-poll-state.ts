/**
 * Shared dashboard poll gating: visibility, idle, route activity.
 * Editorial dashboard fetches are allowlisted — not global on every admin page.
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

/**
 * Routes that may load the full editorial dashboard snapshot.
 * Business / Platform / Team / Settings / overview / SEO must NOT be listed.
 */
export const EDITORIAL_DASHBOARD_ROUTE_PREFIXES = [
  "/admin/editorial",
  "/admin/stories",
  "/admin/articles",
  "/admin/images",
  "/admin/live-wire",
  "/admin/workflow",
  "/admin/intelligence",
  "/admin/analytics",
  "/admin/collaboration",
  "/admin/media",
  "/admin/editor", // index only; /admin/editor/[id] excluded below
] as const;

export function isEditorialDashboardRoute(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/admin/login")) return false;
  if (pathname.startsWith("/admin/forgot-password")) return false;
  if (pathname.startsWith("/admin/reset-password")) return false;
  // Immersive editor workbench — no full desk snapshot
  if (/^\/admin\/editor\/[^/]+/.test(pathname)) return false;

  return EDITORIAL_DASHBOARD_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** @deprecated Use isEditorialDashboardRoute — poll only on allowlisted routes */
export function isDashboardPollRoute(pathname: string): boolean {
  return isEditorialDashboardRoute(pathname);
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
