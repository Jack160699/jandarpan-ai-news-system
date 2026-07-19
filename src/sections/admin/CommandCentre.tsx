"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { seedSharedCanonicalStatus } from "@/hooks/useCanonicalStatus";
import {
  isDocumentHidden,
  statusIntervalForState,
} from "@/lib/admin-v3/admin-poll";
import {
  Av3Metric,
  Av3MetricGrid,
  Av3Panel,
  Av3SkeletonGrid,
  Av3Stack,
  Av3StatusBadge,
} from "@/components/admin-v3";

type DailyPayload = {
  ok: boolean;
  checkedAt: string;
  totalMs: number;
  briefing: string;
  permissions?: { granted: string[]; withheld: string[] };
  comparisons?: {
    publishedToday: number;
    publishedYesterday: number;
    publishedDelta: number;
  };
  today?: {
    published?: number;
    visitors?: number | null;
    pageViews?: number | null;
    organicClicks?: number | null;
    organicImpressions?: number | null;
    aiSpend?: string | null;
    queuePending?: number | null;
    failedJobs?: number | null;
  };
  editorial?: {
    awaitingReview: number | null;
    failedStories: number | null;
    latestPublished: {
      id: string;
      headline: string | null;
      publishedAt: string | null;
      district: string | null;
    } | null;
    metrics?: {
      publishedToday?: {
        source?: string;
        period?: string;
        freshness?: string;
        availability?: string;
      };
    };
  };
  seo?: {
    connected: boolean;
    clicks: number | null;
    impressions: number | null;
    ctr: number;
    averagePosition: number;
  };
  audience?: {
    visitors: number | null;
    pageViews: number | null;
  };
  costs?: {
    today: Record<string, unknown> | null;
    month: Record<string, unknown> | null;
    available: boolean;
  };
  platform?: {
    snapshot: {
      state: string;
      label: string;
      criticalCount?: number;
      warningCount?: number;
      checkedAt: string;
    } | null;
    failedSources: Array<{ source: string; error?: string }>;
  };
  incidents?: Array<{
    id: string;
    title: string;
    detail?: string;
    severity: string;
    href?: string;
  }>;
  activity?: Array<{ id: string; label: string; meta: string; href: string }>;
  sources?: Array<{ source: string; ok: boolean; ms: number; error?: string }>;
  availability?: Record<string, boolean>;
  contract?: {
    generatedAt?: string;
    freshness?: string;
    availability?: string;
  };
};

function metricTrustTitle(opts: {
  source: string;
  period: string;
  freshness?: string;
  availability?: boolean | string;
  updatedAt?: string;
}): string {
  const avail =
    opts.availability === false || opts.availability === "unavailable"
      ? "unavailable"
      : opts.availability === true || opts.availability === "available"
        ? "available"
        : String(opts.availability ?? "unknown");
  const fresh = opts.freshness ?? "unknown";
  const updated = opts.updatedAt ? ` · updated ${opts.updatedAt}` : "";
  return `${opts.source} · ${opts.period} · ${fresh} · ${avail}${updated}`;
}

const CACHE_KEY = "jd-admin-overview-daily-v2";

function readCache(): DailyPayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as DailyPayload) : null;
  } catch {
    return null;
  }
}

export function CommandCentre() {
  const [data, setData] = useState<DailyPayload | null>(() =>
    typeof window === "undefined" ? null : readCache()
  );
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isInitial: boolean) => {
    if (!isInitial) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/overview/daily", { credentials: "include" });
      const json = (await res.json()) as DailyPayload & { error?: string };
      if (!res.ok || !json.ok) {
        if (!data) setError(json.error ?? "Unable to load owner overview");
        else setError(json.error ?? "Refresh failed");
        return;
      }
      setData(json);
      setError(null);
      if (json.platform?.snapshot) {
        const snap = json.platform.snapshot;
        seedSharedCanonicalStatus({
          state: snap.state as "healthy" | "degraded" | "critical" | "unknown",
          label: snap.label,
          reasons: [],
          checkedAt: snap.checkedAt || json.checkedAt,
          criticalCount: snap.criticalCount ?? 0,
          warningCount: snap.warningCount ?? 0,
          topIncidents: [],
        });
      }
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(json));
      } catch {
        /* ignore */
      }
    } catch {
      if (!data) setError("Network error loading owner overview");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    void load(true);
    let timer: number | null = null;
    const schedule = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!isDocumentHidden()) void load(false);
        schedule();
      }, statusIntervalForState(null));
    };
    schedule();
    return () => {
      if (timer != null) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return (
      <Av3Stack>
        <Av3SkeletonGrid count={6} />
      </Av3Stack>
    );
  }

  if (!data) {
    return (
      <Av3Panel title="Command centre unavailable">
        <p className="av3-note">{error}</p>
        <button type="button" className="av3-btn av3-btn--ghost" onClick={() => void load(true)}>
          Retry
        </button>
      </Av3Panel>
    );
  }

  const platform = data.platform?.snapshot;
  const incidents = data.incidents ?? [];
  const activity = data.activity ?? [];
  const sources = data.sources ?? [];
  const withheld = data.permissions?.withheld ?? [];
  const granted = new Set(data.permissions?.granted ?? []);
  const canCosts = Boolean(data.costs) || granted.has("costs");
  const canEditorial = Boolean(data.editorial) || granted.has("editorial");
  const canSeo = Boolean(data.seo) || granted.has("seo");
  const canPlatform = Boolean(data.platform) || granted.has("platform");
  const canAudience = Boolean(data.audience) || granted.has("audience") || data.today?.visitors != null;

  return (
    <Av3Stack className="av3-owner">
      <section className="av3-owner-summary">
        <div className="av3-owner-summary__head">
          {platform ? (
            <Av3StatusBadge
              tone={
                platform.state === "healthy" ||
                platform.state === "warning" ||
                platform.state === "degraded" ||
                platform.state === "critical" ||
                platform.state === "unknown"
                  ? platform.state
                  : "unknown"
              }
              label={platform.label}
            />
          ) : (
            <Av3StatusBadge
              tone="unknown"
              label={canPlatform ? "Platform summary pending" : "Role-limited view"}
            />
          )}
          <p className="av3-meta">
            {refreshing ? "Refreshing… · " : null}
            Updated <ClientTime iso={data.checkedAt} preset="time" /> · {data.totalMs}ms
          </p>
        </div>
        <p className="av3-owner-summary__text">{data.briefing}</p>
        {withheld.length > 0 ? (
          <p className="av3-note">
            Some sections are hidden for your role ({withheld.join(", ")}).
          </p>
        ) : null}
        {error ? <p className="av3-note av3-note--warn">{error}</p> : null}
      </section>

      <Av3Panel title="Needs attention now" subtitle="Distinct owner actions">
        {incidents.length === 0 && !(data.editorial?.awaitingReview ?? 0) ? (
          <p className="av3-note">No urgent owner actions in this snapshot.</p>
        ) : (
          <ul className="av3-attention-list">
            {(data.editorial?.awaitingReview ?? 0) > 0 ? (
              <li className="av3-attention-row av3-attention-row--warning">
                <Link href="/admin/stories">
                  <em>Editorial</em>
                  <strong>
                    {data.editorial?.awaitingReview} stor
                    {data.editorial?.awaitingReview === 1 ? "y" : "ies"} awaiting review
                  </strong>
                </Link>
              </li>
            ) : null}
            {incidents.map((item) => (
              <li
                key={item.id}
                className={`av3-attention-row av3-attention-row--${item.severity}`}
              >
                <Link href={item.href || "/admin/health"}>
                  <em>{item.severity}</em>
                  <strong>{item.title}</strong>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Av3Panel>

      <Av3Panel title="Today" subtitle="Daily operating metrics vs yesterday where available" compact>
        <Av3MetricGrid className="av3-kpi-compact">
          {canEditorial ? (
            <Av3Metric
              label="Published today"
              value={data.today?.published ?? "—"}
              hint={
                data.comparisons
                  ? data.comparisons.publishedDelta === 0
                    ? "Flat vs yesterday"
                    : `${data.comparisons.publishedDelta > 0 ? "+" : ""}${data.comparisons.publishedDelta} vs yesterday`
                  : undefined
              }
              trustTitle={metricTrustTitle({
                source:
                  data.editorial?.metrics?.publishedToday?.source ??
                  "generated_articles.published_at",
                period:
                  data.editorial?.metrics?.publishedToday?.period ?? "today_local",
                freshness:
                  data.editorial?.metrics?.publishedToday?.freshness ??
                  data.contract?.freshness,
                availability: data.availability?.editorial,
                updatedAt: data.checkedAt,
              })}
            />
          ) : null}
          {canAudience ? (
            <Av3Metric
              label="Visitors / views"
              value={
                data.today?.visitors != null
                  ? data.today.visitors.toLocaleString("en-IN")
                  : data.today?.pageViews != null
                    ? data.today.pageViews.toLocaleString("en-IN")
                    : "—"
              }
              hint={data.availability?.audience ? "Audience today" : "Analytics pending"}
              trustTitle={metricTrustTitle({
                source: "analytics.dashboard",
                period: "today",
                freshness: data.contract?.freshness,
                availability: data.availability?.audience,
                updatedAt: data.checkedAt,
              })}
            />
          ) : null}
          {canSeo ? (
            <Av3Metric
              label="Organic clicks"
              value={
                data.today?.organicClicks != null
                  ? data.today.organicClicks.toLocaleString("en-IN")
                  : "—"
              }
              hint={
                data.today?.organicImpressions != null
                  ? `${data.today.organicImpressions.toLocaleString("en-IN")} impr.`
                  : data.availability?.seo
                    ? "Search Console"
                    : "SEO not connected"
              }
              trustTitle={metricTrustTitle({
                source: "seo.search_console",
                period: "gsc_rolling",
                freshness: data.contract?.freshness,
                availability: data.availability?.seo,
                updatedAt: data.checkedAt,
              })}
            />
          ) : null}
          {canCosts ? (
            <Av3Metric
              label="AI spend"
              value={data.today?.aiSpend ?? "—"}
              hint={data.costs?.available ? "Today" : "Not connected"}
              trustTitle={metricTrustTitle({
                source: "ops.executive",
                period: "today",
                freshness: data.contract?.freshness,
                availability: data.availability?.costs ?? data.costs?.available,
                updatedAt: data.checkedAt,
              })}
            />
          ) : null}
          {canEditorial ? (
            <>
              <Av3Metric
                label="Pipeline queue"
                value={data.today?.queuePending ?? "—"}
                hint="AI jobs waiting"
                trustTitle={metricTrustTitle({
                  source: "ai_queue.pending",
                  period: "now",
                  freshness: data.contract?.freshness,
                  availability: data.availability?.editorial,
                  updatedAt: data.checkedAt,
                })}
              />
              <Av3Metric
                label="Failed jobs"
                value={data.today?.failedJobs ?? "—"}
                hint="Queue errors"
                trustTitle={metricTrustTitle({
                  source: "editorial.failed_stories",
                  period: "now",
                  freshness: data.contract?.freshness,
                  availability: data.availability?.editorial,
                  updatedAt: data.checkedAt,
                })}
              />
            </>
          ) : null}
        </Av3MetricGrid>
      </Av3Panel>

      {canCosts && !data.costs?.available ? (
        <div className="av3-empty-panel">
          <strong>AI cost reporting unavailable</strong>
          <p>Connect executive costs to track daily spend.</p>
          <Link href="/admin/executive">Review cost setup</Link>
        </div>
      ) : null}

      <section className="av3-pulse-grid" aria-label="Workspace pulse">
        {canEditorial ? (
          <Av3Panel title="Editorial" subtitle="What to clear next">
            <ul className="av3-status-rows">
              <li>
                <span>Queue depth</span>
                <strong>{data.today?.queuePending ?? "—"}</strong>
              </li>
              <li>
                <span>Failed stories</span>
                <strong>{data.editorial?.failedStories ?? "—"}</strong>
              </li>
              <li>
                <span>Latest published</span>
                <strong className="av3-status-rows__soft">
                  {data.editorial?.latestPublished?.headline?.slice(0, 64) ?? "—"}
                </strong>
              </li>
            </ul>
            <Link href="/admin/stories" className="av3-panel-link">
              Story Queue
            </Link>
          </Av3Panel>
        ) : null}

        {canSeo ? (
          <Av3Panel title="Audience & SEO" subtitle="Quality signals">
            <ul className="av3-status-rows">
              <li>
                <span>CTR</span>
                <strong>
                  {data.seo && Number.isFinite(data.seo.ctr)
                    ? `${Number(data.seo.ctr).toFixed(1)}%`
                    : "—"}
                </strong>
              </li>
              <li>
                <span>Avg position</span>
                <strong>
                  {data.seo && Number.isFinite(data.seo.averagePosition)
                    ? data.seo.averagePosition.toFixed(1)
                    : "—"}
                </strong>
              </li>
              <li>
                <span>Console</span>
                <strong>{data.seo?.connected ? "Connected" : "Not connected"}</strong>
              </li>
            </ul>
            <Link href="/admin/seo/search-console" className="av3-panel-link">
              Search Console
            </Link>
          </Av3Panel>
        ) : null}

        {canPlatform ? (
          <Av3Panel title="Platform" subtitle="Next reliability checks">
            <ul className="av3-status-rows">
              <li>
                <span>Open incidents</span>
                <strong>{incidents.length}</strong>
              </li>
              <li>
                <span>Critical services</span>
                <strong>{platform?.criticalCount ?? 0}</strong>
              </li>
              <li>
                <span>Warnings</span>
                <strong>{platform?.warningCount ?? 0}</strong>
              </li>
            </ul>
            <Link href="/admin/health" className="av3-panel-link">
              Platform health
            </Link>
          </Av3Panel>
        ) : null}
      </section>

      <Av3Panel title="Recent important activity" subtitle="What changed">
        {activity.length === 0 ? (
          <p className="av3-note">No recent owner-level activity in this snapshot.</p>
        ) : (
          <ul className="av3-activity-list">
            {activity.map((item) => (
              <li key={item.id}>
                <Link href={item.href}>
                  <em>{item.meta}</em>
                  <strong>{item.label}</strong>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Av3Panel>

      {sources.some((s) => !s.ok) ? (
        <Av3Panel title="Source availability" subtitle="Partial refresh details" compact>
          <ul className="av3-status-rows">
            {sources.map((s) => (
              <li key={s.source}>
                <span>{s.source}</span>
                <strong>
                  {s.ok ? `${s.ms}ms` : s.error ?? "failed"}
                </strong>
              </li>
            ))}
          </ul>
        </Av3Panel>
      ) : null}
    </Av3Stack>
  );
}
