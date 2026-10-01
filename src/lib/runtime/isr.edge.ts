/**
 * Supabase Edge implementation of src/lib/infrastructure/cache/isr.ts (swapped in at bundle time).
 *
 * next/cache (revalidateTag / revalidatePath) only exists inside the Next.js runtime on Vercel. An Edge worker that
 * ingests or publishes therefore asks the website to revalidate itself through the authenticated cron route
 * (POST /api/cron/revalidate), exactly as the in-process version would have done. The call is bounded (8 s) and NEVER
 * throws: a missed revalidation only delays freshness until the next ISR expiry / orchestrate run, it must not fail ingestion.
 *
 * Required Edge env: CRON_SCHEDULER_SECRET (bearer) and APP_BASE_URL (falls back to NEXT_PUBLIC_SITE_URL).
 * The exported constants mirror isr.ts; isr-ports.test.ts fails if they drift.
 */

import { LIVE_NEWS_CACHE_TAG } from "@/lib/news/home-ranking";

export const ISR_TAGS = {
  homepage: LIVE_NEWS_CACHE_TAG,
  homepageFeed: "homepage-feed",
  stories: "generated-stories",
  categories: "category-hubs",
} as const;

export const ISR_PATHS = {
  home: "/",
  search: "/search",
  sitemap: "/sitemap.xml",
} as const;

export async function revalidateNewsroomCaches(options?: { publishedStories?: number }): Promise<void> {
  const secret = process.env.CRON_SCHEDULER_SECRET?.trim();
  const base = (process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "").replace(/\/$/, "");
  if (!secret || !base) {
    console.warn("[isr.edge] revalidation skipped: CRON_SCHEDULER_SECRET / APP_BASE_URL not configured");
    return;
  }
  try {
    const res = await fetch(`${base}/api/cron/revalidate`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json", "user-agent": "jandarpan-edge-worker/1" },
      body: JSON.stringify({ publishedStories: options?.publishedStories ?? 0 }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) console.warn(`[isr.edge] revalidate responded HTTP ${res.status}`);
  } catch (err) {
    console.warn("[isr.edge] revalidate failed:", err instanceof Error ? err.message : String(err));
  }
}
