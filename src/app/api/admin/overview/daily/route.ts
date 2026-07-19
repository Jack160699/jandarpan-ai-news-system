/**
 * GET /api/admin/overview/daily — compact owner daily briefing payload.
 * Parallel sources with per-source budgets; returns partial results.
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { buildHealthSummary } from "@/lib/admin-v3/health-summary";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { countPendingAiQueue } from "@/lib/news/ai/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Timed<T> = {
  source: string;
  ok: boolean;
  ms: number;
  error?: string;
  data?: T;
};

async function timed<T>(source: string, fn: () => Promise<T>, budgetMs = 1200): Promise<Timed<T>> {
  const started = Date.now();
  try {
    const data = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${source}_timeout`)), budgetMs)
      ),
    ]);
    return { source, ok: true, ms: Date.now() - started, data };
  } catch (err) {
    return {
      source,
      ok: false,
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const wallStart = Date.now();
  const todayStart = startOfDay();
  const yesterdayStart = startOfDay(new Date(Date.now() - 86_400_000));

  const [healthR, editorialR, execR, gscR, analyticsR] = await Promise.all([
    timed("platform", () => buildHealthSummary(), 1500),
    timed("editorial", async () => {
      if (!isSupabaseConfigured()) throw new Error("supabase_missing");
      const sb = createAdminServerClient();
      const todayIso = todayStart.toISOString();
      const yIso = yesterdayStart.toISOString();
      const [
        publishedToday,
        publishedYesterday,
        pending,
        failedQueue,
        queueDepth,
        latest,
      ] = await Promise.all([
        sb
          .from("generated_articles")
          .select("id", { count: "exact", head: true })
          .gte("published_at", todayIso)
          .neq("editorial_status", "rejected"),
        sb
          .from("generated_articles")
          .select("id", { count: "exact", head: true })
          .gte("published_at", yIso)
          .lt("published_at", todayIso)
          .neq("editorial_status", "rejected"),
        sb
          .from("generated_articles")
          .select("id", { count: "exact", head: true })
          .eq("editorial_status", "pending"),
        sb
          .from("news_ai_queue")
          .select("id", { count: "exact", head: true })
          .not("error", "is", null),
        countPendingAiQueue().catch(() => 0),
        sb
          .from("generated_articles")
          .select("id,headline,published_at")
          .neq("editorial_status", "rejected")
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const latestRow = latest.data as {
        id: string;
        headline: string | null;
        published_at: string | null;
      } | null;
      return {
        publishedToday: publishedToday.count ?? 0,
        publishedYesterday: publishedYesterday.count ?? 0,
        awaitingReview: pending.count ?? 0,
        failedStories: failedQueue.count ?? 0,
        queuePending: typeof queueDepth === "number" ? queueDepth : 0,
        latestPublished: latestRow
          ? {
              id: latestRow.id,
              headline: latestRow.headline,
              publishedAt: latestRow.published_at,
              district: null as string | null,
            }
          : null,
      };
    }, 1500),
    timed("costs", async () => {
      const { getExecutiveDashboard } = await import("@/lib/observability/executive-dashboard");
      return getExecutiveDashboard();
    }, 1500),
    timed("seo", async () => {
      const base = new URL(request.url).origin;
      const res = await fetch(`${base}/api/admin/seo/search-console`, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`gsc_${res.status}`);
      return res.json();
    }, 1500),
    timed("audience", async () => {
      const base = new URL(request.url).origin;
      const res = await fetch(`${base}/api/analytics/dashboard`, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`analytics_${res.status}`);
      return res.json();
    }, 1500),
  ]);

  const editorial = editorialR.data;
  const health = healthR.data;
  const exec = execR.data as
    | {
        overview?: {
          todaySpend?: Record<string, unknown>;
          monthSpend?: Record<string, unknown>;
          currentMonthSpend?: Record<string, unknown>;
        };
      }
    | undefined;
  const spend = exec?.overview?.todaySpend;
  const monthSpend = exec?.overview?.monthSpend ?? exec?.overview?.currentMonthSpend;

  const gsc = (gscR.data ?? {}) as Record<string, unknown>;
  const gscSummary = (gsc.summary ?? gsc.data ?? gsc) as Record<string, unknown>;
  const clicks = Number(gscSummary.clicks ?? gscSummary.totalClicks);
  const impressions = Number(gscSummary.impressions ?? gscSummary.totalImpressions);

  const analytics = (analyticsR.data ?? {}) as Record<string, unknown>;
  const aOverview = (analytics.overview ?? analytics.dashboard ?? analytics) as Record<
    string,
    unknown
  >;
  const visitors = Number(aOverview.visitors ?? aOverview.sessions);
  const pageViews = Number(aOverview.pageViews ?? aOverview.pageviews);

  const publishedToday = editorial?.publishedToday ?? 0;
  const publishedYesterday = editorial?.publishedYesterday ?? 0;
  const deltaPub = publishedToday - publishedYesterday;

  const briefingParts: string[] = [];
  briefingParts.push(
    `Today, ${publishedToday} stor${publishedToday === 1 ? "y was" : "ies were"} published` +
      (publishedYesterday > 0
        ? ` (${deltaPub === 0 ? "flat vs yesterday" : deltaPub > 0 ? `+${deltaPub} vs yesterday` : `${deltaPub} vs yesterday`})`
        : "") +
      "."
  );
  if (Number.isFinite(impressions) && impressions > 0) {
    briefingParts.push(
      `Search Console shows ${impressions.toLocaleString("en-IN")} impressions and ${Number.isFinite(clicks) ? clicks.toLocaleString("en-IN") : "—"} clicks.`
    );
  } else if (!gscR.ok) {
    briefingParts.push("Search Console data is not available in this refresh.");
  }
  if (spend?.display || spend?.usd != null || spend?.inr != null) {
    const label =
      typeof spend.display === "string"
        ? spend.display
        : typeof spend.inr === "number"
          ? `₹${spend.inr.toLocaleString("en-IN")}`
          : `$${Number(spend.usd).toFixed(2)}`;
    briefingParts.push(`AI spend today is ${label}.`);
  } else if (!execR.ok) {
    briefingParts.push("AI cost reporting is not connected.");
  }
  const critical = health?.snapshot?.criticalCount ?? 0;
  if (critical > 0) {
    briefingParts.push(`${critical} platform incident${critical === 1 ? "" : "s"} require attention.`);
  } else if (health?.snapshot?.state === "healthy") {
    briefingParts.push("Platform health is stable.");
  } else if (!healthR.ok) {
    briefingParts.push("Platform health summary did not finish in time.");
  }

  const incidents = (health?.snapshot?.topIncidents ?? health?.snapshot?.reasons ?? []).slice(0, 6);
  const sources = [healthR, editorialR, execR, gscR, analyticsR].map(
    ({ source, ok, ms, error }) => ({ source, ok, ms, error })
  );

  const payload = {
    ok: true,
    checkedAt: new Date().toISOString(),
    totalMs: Date.now() - wallStart,
    briefing: briefingParts.join(" "),
    comparisons: {
      publishedToday,
      publishedYesterday,
      publishedDelta: deltaPub,
    },
    today: {
      published: publishedToday,
      visitors: Number.isFinite(visitors) && visitors > 0 ? visitors : null,
      pageViews: Number.isFinite(pageViews) && pageViews > 0 ? pageViews : null,
      organicClicks: Number.isFinite(clicks) ? clicks : null,
      organicImpressions: Number.isFinite(impressions) ? impressions : null,
      aiSpend:
        typeof spend?.display === "string"
          ? spend.display
          : spend?.inr != null
            ? `₹${Number(spend.inr).toLocaleString("en-IN")}`
            : spend?.usd != null
              ? `$${Number(spend.usd).toFixed(2)}`
              : null,
      queuePending: editorial?.queuePending ?? null,
      failedJobs: editorial?.failedStories ?? null,
    },
    editorial: {
      awaitingReview: editorial?.awaitingReview ?? null,
      failedStories: editorial?.failedStories ?? null,
      latestPublished: editorial?.latestPublished ?? null,
    },
    seo: {
      connected: gscR.ok && (gsc.connected !== false),
      clicks: Number.isFinite(clicks) ? clicks : null,
      impressions: Number.isFinite(impressions) ? impressions : null,
      ctr: Number(gscSummary.ctr),
      averagePosition: Number(gscSummary.position ?? gscSummary.averagePosition),
    },
    costs: {
      today: spend ?? null,
      month: monthSpend ?? null,
      available: Boolean(spend),
    },
    platform: {
      snapshot: health?.snapshot ?? null,
      failedSources: health?.failedSources ?? [],
    },
    incidents,
    activity: [
      editorial?.latestPublished
        ? {
            id: `pub-${editorial.latestPublished.id}`,
            label: editorial.latestPublished.headline || "Latest publication",
            meta: "Published",
            href: `/admin/editor/${editorial.latestPublished.id}`,
          }
        : null,
      editorial && editorial.awaitingReview > 0
        ? {
            id: "review",
            label: `${editorial.awaitingReview} stories awaiting review`,
            meta: "Editorial",
            href: "/admin/stories",
          }
        : null,
      ...incidents.slice(0, 2).map((i) => ({
        id: i.id,
        label: i.title,
        meta: "Platform",
        href: i.href || "/admin/health",
      })),
    ].filter(Boolean),
    sources,
    availability: {
      editorial: editorialR.ok,
      platform: healthR.ok,
      costs: execR.ok,
      seo: gscR.ok,
      audience: analyticsR.ok,
    },
  };

  console.info("[overview-daily]", {
    totalMs: payload.totalMs,
    failed: sources.filter((s) => !s.ok).map((s) => s.source),
  });

  return NextResponse.json(payload);
}
