/**
 * Central pause for NON-ESSENTIAL recurring traffic.
 *
 * While the Supabase project is restricted (402 exceed_egress_quota) every scheduled caller that reaches the API only produces
 * failed requests -- and, for ingestion, wasted NewsData/GNews credits and publisher fetches. Setting JD_PAUSE_RECURRING=true makes
 * the proxy answer those callers with a static 200 before any route (and therefore any Supabase request) runs.
 *
 * Paused: /api/cron/*, /api/fetch-news, /api/process-ai, /api/generate-articles, /api/process-editorial-images.
 * NEVER paused: the website, auth, admin, /api/health*, /api/rss-health, /api/status/production -- recovery tooling must keep working.
 * Reversible: unset the variable (or set it to anything but "true") and redeploy.
 */

import { isCronPath } from "@/lib/infrastructure/production";

const PAUSABLE_EXACT = new Set([
  "/api/fetch-news",
  "/api/process-ai",
  "/api/generate-articles",
  "/api/process-editorial-images",
]);

export function isRecurringTrafficPaused(env: Record<string, string | undefined> = process.env): boolean {
  return env.JD_PAUSE_RECURRING?.trim().toLowerCase() === "true";
}

export function isPausableRecurringPath(pathname: string): boolean {
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
