/**
 * Central pause for NON-ESSENTIAL recurring traffic.
 *
 * While the Supabase project is restricted (402 exceed_egress_quota) every scheduled caller that reaches the API only produces
 * failed requests -- and, for ingestion, wasted NewsData/GNews credits and publisher fetches. Setting JD_PAUSE_RECURRING=true makes
 * the proxy answer those callers with a static 200 before any route (and therefore any Supabase request) runs.
 *
 * Paused: /api/cron/* (except the revalidate hook below), /api/fetch-news, /api/process-ai, /api/generate-articles,
 *         /api/process-editorial-images, and the admin routes that Vercel Cron invokes (see VERCEL_CRON_ONLY).
 * NEVER paused: the website, auth, admin UI/API for humans, /api/health*, /api/rss-health, /api/status/production, and
 *         /api/cron/revalidate -- the Edge editorial worker's publish purge: it only invalidates caches (no Supabase read) and is
 *         what keeps list pages fresh once the Edge pipeline runs while the legacy Vercel jobs stay paused.
 * Reversible: unset the variable (or set it to anything but "true") and redeploy.
 */

import { isCronPath } from "@/lib/infrastructure/production";

const PAUSABLE_EXACT = new Set([
  "/api/fetch-news",
  "/api/process-ai",
  "/api/generate-articles",
  "/api/process-editorial-images",
]);

/** Cron paths that must keep working while the legacy jobs are paused. */
const NEVER_PAUSED = new Set(["/api/cron/revalidate"]);

/**
 * Admin routes that Vercel Cron (vercel.json) invokes. They are also usable by a human admin, so they are paused ONLY for scheduler
 * callers (Vercel Cron sets the `vercel-cron/1.0` user agent; GitHub/QStash send a Bearer secret), never for a signed-in human.
 */
export const VERCEL_CRON_ONLY: ReadonlySet<string> = new Set(["/api/admin/audit-branded-images"]);

type HeaderReader = { get(name: string): string | null };

export function isRecurringTrafficPaused(env: Record<string, string | undefined> = process.env): boolean {
  return env.JD_PAUSE_RECURRING?.trim().toLowerCase() === "true";
}

export function isVercelCronRequest(headers?: HeaderReader): boolean {
  const ua = headers?.get("user-agent") ?? "";
  return /^vercel-cron\//i.test(ua) || headers?.get("x-vercel-cron") === "1";
}

/** A scheduler/automation caller: Vercel Cron, or any machine credential (Bearer secret / x-cron-secret). Humans use a session cookie. */
export function isScheduledCaller(headers?: HeaderReader): boolean {
  if (isVercelCronRequest(headers)) return true;
  return /^Bearer\s+\S/i.test(headers?.get("authorization") ?? "") || Boolean(headers?.get("x-cron-secret"));
}

export function isPausableRecurringPath(pathname: string, headers?: HeaderReader): boolean {
  if (NEVER_PAUSED.has(pathname)) return false;
  if (VERCEL_CRON_ONLY.has(pathname)) return isScheduledCaller(headers);
  return isCronPath(pathname) || PAUSABLE_EXACT.has(pathname);
}

export function recurringPauseBody(pathname: string): Record<string, unknown> {
  return {
    ok: true,
    paused: true,
    reason: "JD_PAUSE_RECURRING is set: recurring jobs are paused while the Supabase project is restricted.",
    path: pathname,
  };
}
