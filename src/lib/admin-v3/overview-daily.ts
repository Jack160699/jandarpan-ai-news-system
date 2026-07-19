/**
 * Owner daily briefing builder — permission-sectioned payload.
 */

import {
  getCanonicalHealth,
  type CanonicalHealthServiceResult,
} from "@/lib/admin-v3/canonical-health-service";
import { buildAdminMetric } from "@/lib/admin-v3/metric-contract";
import {
  resolveDailySectionAccess,
  type DailySectionAccess,
} from "@/lib/admin-v3/overview-daily-access";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { countPendingAiQueue } from "@/lib/news/ai/queue";

type Timed<T> = {
  source: string;
  ok: boolean;
  ms: number;
  error?: string;
  data?: T;
};

async function timed<T>(
  source: string,
  fn: () => Promise<T>,
  budgetMs = 1200
): Promise<Timed<T>> {
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

export type BuildOverviewDailyInput = {
  role: string;
  requestUrl: string;
  cookieHeader: string | null;
};

export async function buildOverviewDailyPayload(input: BuildOverviewDailyInput) {
  const access = resolveDailySectionAccess(input.role);
  const wallStart = Date.now();
  const generatedAt = new Date().toISOString();
  const todayStart = startOfDay();
  const yesterdayStart = startOfDay(new Date(Date.now() - 86_400_000));
  const period = "today";

  const tasks: Promise<Timed<unknown>>[] = [];

  const editorialTask = access.bySection.editorial
    ? timed("editorial", async () => {
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
      }, 1500)
    : Promise.resolve({
        source: "editorial",
        ok: false,
        ms: 0,
        error: "forbidden",
      } satisfies Timed<unknown>);

  const healthTask = access.bySection.platform
    ? timed("platform", () => getCanonicalHealth(), 1500)
    : Promise.resolve({
        source: "platform",
        ok: false,
        ms: 0,
        error: "forbidden",
      } satisfies Timed<unknown>);

  const costsTask = access.bySection.costs
    ? timed("costs", async () => {
        const { getExecutiveDashboard } = await import(
          "@/lib/observability/executive-dashboard"
        );
        return getExecutiveDashboard();
      }, 1500)
    : Promise.resolve({
        source: "costs",
        ok: false,
        ms: 0,
        error: "forbidden",
      } satisfies Timed<unknown>);

  const seoTask = access.bySection.seo
    ? timed("seo", async () => {
        const base = new URL(input.requestUrl).origin;
        const res = await fetch(`${base}/api/admin/seo/search-console`, {
          headers: { cookie: input.cookieHeader ?? "" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`gsc_${res.status}`);
        return res.json();
      }, 1500)
    : Promise.resolve({
        source: "seo",
        ok: false,
        ms: 0,
        error: "forbidden",
      } satisfies Timed<unknown>);

  const audienceTask = access.bySection.audience
    ? timed("audience", async () => {
        const base = new URL(input.requestUrl).origin;
        const res = await fetch(`${base}/api/analytics/dashboard`, {
          headers: { cookie: input.cookieHeader ?? "" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`analytics_${res.status}`);
        return res.json();
      }, 1500)
    : Promise.resolve({
        source: "audience",
        ok: false,
        ms: 0,
        error: "forbidden",
      } satisfies Timed<unknown>);

  tasks.push(editorialTask, healthTask, costsTask, seoTask, audienceTask);
  const [editorialR, healthR, execR, gscR, analyticsR] = await Promise.all(tasks);

  return assembleDailyPayload({
    access,
    generatedAt,
    wallStart,
    editorialR: editorialR as Timed<EditorialData>,
    healthR: healthR as Timed<CanonicalHealthServiceResult>,
    execR: execR as Timed<ExecData>,
    gscR: gscR as Timed<Record<string, unknown>>,
    analyticsR: analyticsR as Timed<Record<string, unknown>>,
    period,
  });
}

type EditorialData = {
  publishedToday: number;
  publishedYesterday: number;
  awaitingReview: number;
  failedStories: number;
  queuePending: number;
  latestPublished: {
    id: string;
    headline: string | null;
    publishedAt: string | null;
    district: string | null;
  } | null;
};

type ExecData = {
  overview?: {
    todaySpend?: Record<string, unknown>;
    monthSpend?: Record<string, unknown>;
    currentMonthSpend?: Record<string, unknown>;
  };
};

export function assembleDailyPayload(args: {
  access: DailySectionAccess;
  generatedAt: string;
  wallStart: number;
  editorialR: Timed<EditorialData>;
  healthR: Timed<CanonicalHealthServiceResult>;
  execR: Timed<ExecData>;
  gscR: Timed<Record<string, unknown>>;
  analyticsR: Timed<Record<string, unknown>>;
  period: string;
}) {
  const {
    access,
    generatedAt,
    wallStart,
    editorialR,
    healthR,
    execR,
    gscR,
    analyticsR,
    period,
  } = args;

  const editorial = access.bySection.editorial ? editorialR.data : undefined;
  const health = access.bySection.platform ? healthR.data : undefined;
  const exec = access.bySection.costs ? execR.data : undefined;
  const spend = exec?.overview?.todaySpend;
  const monthSpend =
    exec?.overview?.monthSpend ?? exec?.overview?.currentMonthSpend;

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
  if (access.bySection.editorial && editorialR.ok) {
    briefingParts.push(
      `Today, ${publishedToday} stor${publishedToday === 1 ? "y was" : "ies were"} published` +
        (publishedYesterday > 0
          ? ` (${deltaPub === 0 ? "flat vs yesterday" : deltaPub > 0 ? `+${deltaPub} vs yesterday` : `${deltaPub} vs yesterday`})`
          : "") +
        "."
    );
  }
  if (access.bySection.seo) {
    if (Number.isFinite(impressions) && impressions > 0) {
      briefingParts.push(
        `Search Console shows ${impressions.toLocaleString("en-IN")} impressions and ${Number.isFinite(clicks) ? clicks.toLocaleString("en-IN") : "—"} clicks.`
      );
    } else if (!gscR.ok && gscR.error !== "forbidden") {
      briefingParts.push("Search Console data is not available in this refresh.");
    }
  }
  if (access.bySection.costs) {
    if (spend?.display || spend?.usd != null || spend?.inr != null) {
      const label =
        typeof spend.display === "string"
          ? spend.display
          : typeof spend.inr === "number"
            ? `₹${spend.inr.toLocaleString("en-IN")}`
            : `$${Number(spend.usd).toFixed(2)}`;
      briefingParts.push(`AI spend today is ${label}.`);
    } else if (!execR.ok && execR.error !== "forbidden") {
      briefingParts.push("AI cost reporting is not connected.");
    }
  }
  if (access.bySection.platform) {
    const critical = health?.snapshot?.criticalCount ?? 0;
    if (critical > 0) {
      briefingParts.push(
        `${critical} platform incident${critical === 1 ? "" : "s"} require attention.`
      );
    } else if (health?.snapshot?.state === "healthy") {
      briefingParts.push("Platform health is stable.");
    } else if (!healthR.ok && healthR.error !== "forbidden") {
      briefingParts.push("Platform health summary did not finish in time.");
    }
  }
  if (briefingParts.length === 0) {
    briefingParts.push("Limited briefing for your role — permitted sections only.");
  }

  const incidents =
    access.bySection.incidents
      ? (health?.snapshot?.topIncidents ?? health?.snapshot?.reasons ?? []).slice(0, 6)
      : [];

  const sources = [healthR, editorialR, execR, gscR, analyticsR]
    .filter((s) => s.error !== "forbidden")
    .map(({ source, ok, ms, error }) => ({ source, ok, ms, error }));

  const payload: Record<string, unknown> = {
    ok: true,
    checkedAt: generatedAt,
    generatedAt,
    totalMs: Date.now() - wallStart,
    briefing: briefingParts.join(" "),
    permissions: {
      granted: access.granted,
      withheld: access.withheld,
    },
    contract: {
      generatedAt,
      freshness: "live" as const,
      availability: access.withheld.length ? ("partial" as const) : ("available" as const),
    },
    sources,
    availability: {
      editorial: access.bySection.editorial && editorialR.ok,
      platform: access.bySection.platform && healthR.ok,
      costs: access.bySection.costs && execR.ok,
      seo: access.bySection.seo && gscR.ok,
      audience: access.bySection.audience && analyticsR.ok,
      incidents: access.bySection.incidents && healthR.ok,
    },
  };

  if (access.bySection.editorial) {
    payload.comparisons = {
      publishedToday,
      publishedYesterday,
      publishedDelta: deltaPub,
    };
    payload.editorial = {
      awaitingReview: editorial?.awaitingReview ?? null,
      failedStories: editorial?.failedStories ?? null,
      latestPublished: editorial?.latestPublished ?? null,
      metrics: {
        publishedToday: buildAdminMetric(publishedToday, {
          source: "generated_articles.published_at",
          unit: "stories",
          period,
          generatedAt,
          ok: editorialR.ok,
          comparison: {
            value: publishedYesterday,
            period: "yesterday",
            label: "vs yesterday",
          },
        }),
      },
    };
  }

  // today block only includes permitted fields
  const today: Record<string, unknown> = {};
  if (access.bySection.editorial) {
    today.published = publishedToday;
    today.queuePending = editorial?.queuePending ?? null;
    today.failedJobs = editorial?.failedStories ?? null;
  }
  if (access.bySection.audience) {
    today.visitors =
      analyticsR.ok && Number.isFinite(visitors) && visitors > 0 ? visitors : null;
    today.pageViews =
      analyticsR.ok && Number.isFinite(pageViews) && pageViews > 0 ? pageViews : null;
  }
  if (access.bySection.seo) {
    today.organicClicks = gscR.ok && Number.isFinite(clicks) ? clicks : null;
    today.organicImpressions =
      gscR.ok && Number.isFinite(impressions) ? impressions : null;
  }
  if (access.bySection.costs) {
    today.aiSpend =
      typeof spend?.display === "string"
        ? spend.display
        : spend?.inr != null
          ? `₹${Number(spend.inr).toLocaleString("en-IN")}`
          : spend?.usd != null
            ? `$${Number(spend.usd).toFixed(2)}`
            : null;
  }
  if (Object.keys(today).length > 0) {
    payload.today = today;
  }

  if (access.bySection.seo) {
    payload.seo = {
      connected: gscR.ok && gsc.connected !== false,
      clicks: Number.isFinite(clicks) ? clicks : null,
      impressions: Number.isFinite(impressions) ? impressions : null,
      ctr: Number(gscSummary.ctr),
      averagePosition: Number(gscSummary.position ?? gscSummary.averagePosition),
      metrics: {
        impressions: buildAdminMetric(
          Number.isFinite(impressions) ? impressions : null,
          {
            source: "google_search_console",
            unit: "impressions",
            period,
            generatedAt,
            ok: gscR.ok,
            availability: gscR.ok ? "available" : "unavailable",
          }
        ),
      },
    };
  }

  if (access.bySection.audience) {
    payload.audience = {
      visitors: Number.isFinite(visitors) && visitors > 0 ? visitors : null,
      pageViews: Number.isFinite(pageViews) && pageViews > 0 ? pageViews : null,
      metrics: {
        visitors: buildAdminMetric(
          Number.isFinite(visitors) && visitors > 0 ? visitors : null,
          {
            source: "analytics.dashboard",
            unit: "visitors",
            period,
            generatedAt,
            ok: analyticsR.ok,
          }
        ),
      },
    };
  }

  if (access.bySection.costs) {
    payload.costs = {
      today: spend ?? null,
      month: monthSpend ?? null,
      available: Boolean(spend),
      metrics: {
        todaySpend: buildAdminMetric(
          typeof spend?.display === "string"
            ? spend.display
            : spend?.inr != null
              ? Number(spend.inr)
              : spend?.usd != null
                ? Number(spend.usd)
                : null,
          {
            source: "executive_dashboard.todaySpend",
            unit: typeof spend?.inr === "number" ? "INR" : "USD",
            period,
            generatedAt,
            ok: execR.ok && Boolean(spend),
            availability:
              execR.ok && spend
                ? "available"
                : execR.ok
                  ? "not_configured"
                  : "unavailable",
          }
        ),
      },
    };
  }

  if (access.bySection.platform) {
    payload.platform = {
      snapshot: health?.snapshot ?? null,
      failedSources: health?.failedSources ?? [],
      contract: {
        generatedAt: health?.checkedAt ?? generatedAt,
        freshness: healthR.ok ? (health?.stale ? "stale" : "live") : "unavailable",
        availability: healthR.ok
          ? health?.stale
            ? "partial"
            : "available"
          : "unavailable",
        source: "health_summary",
      },
    };
  }

  if (access.bySection.incidents) {
    payload.incidents = incidents;
  }

  const activity = [];
  if (access.bySection.editorial && editorial?.latestPublished) {
    activity.push({
      id: `pub-${editorial.latestPublished.id}`,
      label: editorial.latestPublished.headline || "Latest publication",
      meta: "Published",
      href: `/admin/editor/${editorial.latestPublished.id}`,
    });
  }
  if (access.bySection.editorial && editorial && editorial.awaitingReview > 0) {
    activity.push({
      id: "review",
      label: `${editorial.awaitingReview} stories awaiting review`,
      meta: "Editorial",
      href: "/admin/stories",
    });
  }
  if (access.bySection.incidents) {
    for (const i of incidents.slice(0, 2)) {
      activity.push({
        id: i.id,
        label: i.title,
        meta: "Platform",
        href: i.href || "/admin/health",
      });
    }
  }
  payload.activity = activity;

  return payload;
}
