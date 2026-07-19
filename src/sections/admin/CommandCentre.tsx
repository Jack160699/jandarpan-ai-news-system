"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { useCanonicalStatus } from "@/hooks/useCanonicalStatus";
import {
  Av3Metric,
  Av3MetricGrid,
  Av3Panel,
  Av3SkeletonGrid,
  Av3Stack,
  Av3StatusBadge,
} from "@/components/admin-v3";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function money(v: unknown): string {
  const r = asRecord(v);
  if (typeof r.display === "string") return r.display;
  if (typeof r.usdLabel === "string") return r.usdLabel;
  if (typeof r.inr === "number") return `₹${r.inr.toLocaleString("en-IN")}`;
  if (typeof r.usd === "number") return `$${r.usd.toFixed(2)}`;
  return "—";
}

type AttentionItem = {
  id: string;
  area: "Editorial" | "Pipeline" | "SEO" | "Cost" | "Platform";
  label: string;
  href: string;
  severity: string;
};

type ActivityItem = {
  id: string;
  label: string;
  meta: string;
  href: string;
};

export function CommandCentre() {
  const { data, loading, error } = useAdminNewsroom();
  const { snapshot: health, loading: healthLoading } = useCanonicalStatus();
  const [costToday, setCostToday] = useState<string>("—");
  const [costAvailable, setCostAvailable] = useState(false);
  const [trafficLabel, setTrafficLabel] = useState<string>("—");
  const [seoLabel, setSeoLabel] = useState<string>("Not connected");
  const [topStory, setTopStory] = useState<string | null>(null);

  const generated = useMemo(
    () => (Array.isArray(data?.generatedArticles) ? data.generatedArticles : []),
    [data]
  );

  const publishedToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return generated.filter((a) => {
      if (!a.published_at || a.editorial_status === "rejected") return false;
      return new Date(a.published_at).getTime() >= start.getTime();
    }).length;
  }, [generated]);

  const pending = useMemo(
    () => generated.filter((a) => a.editorial_status === "pending").length,
    [generated]
  );

  const failedStories = useMemo(() => {
    const q = Array.isArray(data?.aiQueue) ? data.aiQueue : [];
    return q.filter((item) => Boolean(item.error)).length;
  }, [data]);

  const queueDepth = useMemo(() => {
    const q = Array.isArray(data?.aiQueue) ? data.aiQueue : [];
    return q.length;
  }, [data]);

  const breakingCount = useMemo(
    () => generated.filter((a) => a.is_breaking).length,
    [generated]
  );

  const ingestionFailures = useMemo(() => {
    const f = data?.ingestion?.recentFailures;
    return Array.isArray(f) ? f.length : 0;
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    async function loadExtras() {
      const [execRes, gscRes, analyticsRes] = await Promise.allSettled([
        fetch("/api/admin/ops/executive", { credentials: "include" }),
        fetch("/api/admin/seo/search-console", { credentials: "include" }),
        fetch("/api/analytics/dashboard", { credentials: "include" }),
      ]);
      if (cancelled) return;

      if (execRes.status === "fulfilled" && execRes.value.ok) {
        try {
          const json = await execRes.value.json();
          const overview = asRecord(asRecord(json.dashboard).overview);
          const spend = overview.todaySpend;
          setCostToday(money(spend));
          setCostAvailable(Boolean(spend));
        } catch {
          /* keep placeholder */
        }
      }

      if (gscRes.status === "fulfilled" && gscRes.value.ok) {
        try {
          const json = await gscRes.value.json();
          const summary = asRecord(json.summary ?? json.data ?? json);
          const clicks = Number(summary.clicks ?? summary.totalClicks);
          const impressions = Number(
            summary.impressions ?? summary.totalImpressions
          );
          if (Number.isFinite(clicks) || Number.isFinite(impressions)) {
            const c = Number.isFinite(clicks) ? clicks : 0;
            const i = Number.isFinite(impressions) ? impressions : 0;
            setSeoLabel(`${c.toLocaleString("en-IN")} clicks · ${i.toLocaleString("en-IN")} impr.`);
          } else if (json.ok === false || json.connected === false) {
            setSeoLabel("Connect Search Console");
          } else {
            setSeoLabel("Search Console ready");
          }
        } catch {
          setSeoLabel("Search Console unavailable");
        }
      }

      if (analyticsRes.status === "fulfilled" && analyticsRes.value.ok) {
        try {
          const json = await analyticsRes.value.json();
          const overview = asRecord(json.overview ?? json.dashboard ?? json);
          const visitors = Number(
            overview.visitors ?? overview.pageViews ?? overview.sessions
          );
          if (Number.isFinite(visitors) && visitors > 0) {
            setTrafficLabel(visitors.toLocaleString("en-IN"));
          }
          const top = asRecord(
            Array.isArray(overview.topStories)
              ? overview.topStories[0]
              : overview.topStory
          );
          const headline = String(top.headline ?? top.title ?? "").trim();
          if (headline) setTopStory(headline.slice(0, 72));
        } catch {
          /* keep placeholder */
        }
      }
    }

    void loadExtras();
    return () => {
      cancelled = true;
    };
  }, []);

  const attention = useMemo(() => {
    const items: AttentionItem[] = [];
    if (pending > 0) {
      items.push({
        id: "editorial-review",
        area: "Editorial",
        label: `${pending} stor${pending === 1 ? "y" : "ies"} awaiting review`,
        href: "/admin/stories",
        severity: "warning",
      });
    }
    if (failedStories > 0) {
      items.push({
        id: "pipeline-fail",
        area: "Pipeline",
        label: `${failedStories} AI queue failure${failedStories === 1 ? "" : "s"}`,
        href: "/admin/system",
        severity: "critical",
      });
    }
    if (ingestionFailures > 0) {
      items.push({
        id: "ingest-fail",
        area: "Pipeline",
        label: `${ingestionFailures} ingestion failure${ingestionFailures === 1 ? "" : "s"}`,
        href: "/admin/ingestion",
        severity: "warning",
      });
    }
    for (const reason of (health?.topIncidents ?? health?.reasons ?? []).slice(0, 3)) {
      const area: AttentionItem["area"] =
        reason.title.toLowerCase().includes("seo") ||
        reason.title.toLowerCase().includes("sitemap")
          ? "SEO"
          : reason.title.toLowerCase().includes("cost") ||
              reason.title.toLowerCase().includes("spend")
            ? "Cost"
            : reason.title.toLowerCase().includes("cron") ||
                reason.title.toLowerCase().includes("worker") ||
                reason.title.toLowerCase().includes("translation")
              ? "Platform"
              : "Platform";
      if (items.some((i) => i.id === reason.id)) continue;
      items.push({
        id: reason.id,
        area,
        label: reason.title,
        href: reason.href || "/admin/health",
        severity: reason.severity,
      });
    }
    if (!costAvailable) {
      items.push({
        id: "cost-setup",
        area: "Cost",
        label: "AI cost reporting needs setup",
        href: "/admin/executive",
        severity: "info",
      });
    }
    // Distinct actionable only
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.area}:${item.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
  }, [
    pending,
    failedStories,
    ingestionFailures,
    health,
    costAvailable,
  ]);

  const activity = useMemo(() => {
    const items: ActivityItem[] = [];
    const latestPublished = generated
      .filter((a) => a.published_at && a.editorial_status !== "rejected")
      .sort(
        (a, b) =>
          new Date(b.published_at ?? 0).getTime() -
          new Date(a.published_at ?? 0).getTime()
      )[0];
    if (latestPublished) {
      items.push({
        id: `pub-${latestPublished.id}`,
        label: latestPublished.headline || "Latest publication",
        meta: "Published",
        href: `/admin/editor/${latestPublished.id}`,
      });
    }
    if (pending > 0) {
      items.push({
        id: "act-review",
        label: `${pending} stories waiting in queue`,
        meta: "Editorial",
        href: "/admin/stories",
      });
    }
    if (seoLabel.includes("clicks") || seoLabel.includes("Connect")) {
      items.push({
        id: "act-seo",
        label: seoLabel,
        meta: "SEO",
        href: "/admin/seo/search-console",
      });
    }
    if (queueDepth > 0) {
      items.push({
        id: "act-pipeline",
        label: `${queueDepth} jobs in AI pipeline`,
        meta: "Pipeline",
        href: "/admin/technical",
      });
    }
    return items.slice(0, 5);
  }, [generated, pending, seoLabel, queueDepth]);

  const summaryLine = useMemo(() => {
    if (health?.state === "critical") {
      return "Platform needs attention — review critical incidents first.";
    }
    if (pending > 0) {
      return `${pending} stor${pending === 1 ? "y" : "ies"} waiting for editorial review.`;
    }
    if (publishedToday > 0) {
      return `${publishedToday} stor${publishedToday === 1 ? "y" : "ies"} published today. Pipeline is moving.`;
    }
    return "Owner overview across editorial, growth, cost and platform.";
  }, [health?.state, pending, publishedToday]);

  if (loading && !data) {
    return (
      <Av3Stack>
        <Av3SkeletonGrid count={6} />
      </Av3Stack>
    );
  }

  if (error && !data) {
    return (
      <Av3Panel title="Command centre unavailable">
        <p className="av3-note">{error}</p>
        <div className="av3-owner-links">
          <Link href="/admin/stories">Story queue</Link>
          <Link href="/admin/health">Platform health</Link>
          <Link href="/admin/business">Business</Link>
        </div>
      </Av3Panel>
    );
  }

  return (
    <Av3Stack className="av3-owner">
      <section className="av3-owner-summary">
        <div className="av3-owner-summary__head">
          {health ? (
            <Av3StatusBadge tone={health.state} label={health.label} />
          ) : (
            <Av3StatusBadge
              tone="unknown"
              label={healthLoading ? "Checking…" : "Production · Unknown"}
            />
          )}
          <p className="av3-meta">
            {data?.fetchedAt ? (
              <>
                Updated <ClientTime iso={data.fetchedAt} preset="time" />
              </>
            ) : (
              "Live owner overview"
            )}
          </p>
        </div>
        <p className="av3-owner-summary__text">{summaryLine}</p>
      </section>

      <Av3Panel title="Needs attention now" subtitle="Distinct actionable incidents">
        {attention.length === 0 ? (
          <p className="av3-note">No urgent owner actions in the current snapshot.</p>
        ) : (
          <ul className="av3-attention-list">
            {attention.map((item) => (
              <li key={item.id} className={`av3-attention-row av3-attention-row--${item.severity}`}>
                <Link href={item.href}>
                  <em>{item.area}</em>
                  <strong>{item.label}</strong>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Av3Panel>

      <section>
        <h3 className="av3-section-title">Today&apos;s pulse</h3>
        <Av3MetricGrid className="av3-kpi-compact">
          <Av3Metric label="Published today" value={publishedToday} hint="Live on site" />
          <Av3Metric
            label="Visitors / views"
            value={trafficLabel}
            hint={trafficLabel === "—" ? "Analytics connection pending" : "Audience today"}
          />
          <Av3Metric
            label="AI spend"
            value={costToday}
            hint={costAvailable ? "Today" : "Not connected"}
          />
          <Av3Metric label="Pipeline queue" value={queueDepth} hint="AI jobs waiting" />
        </Av3MetricGrid>
      </section>

      {!costAvailable ? (
        <div className="av3-empty-panel">
          <strong>AI cost reporting unavailable</strong>
          <p>Connect the executive cost dashboard to track daily spend.</p>
          <Link href="/admin/executive">Open Executive costs</Link>
        </div>
      ) : null}

      <section className="av3-pulse-grid">
        <Av3Panel title="Editorial pulse" subtitle="Newsroom flow">
          <ul className="av3-status-rows">
            <li>
              <span>Awaiting review</span>
              <strong>{pending}</strong>
            </li>
            <li>
              <span>Failed stories</span>
              <strong>{failedStories}</strong>
            </li>
            <li>
              <span>Breaking / live</span>
              <strong>{breakingCount}</strong>
            </li>
          </ul>
          <Link href="/admin/stories" className="av3-panel-link">
            Open Story Queue
          </Link>
        </Av3Panel>

        <Av3Panel title="Growth pulse" subtitle="Audience and SEO">
          <ul className="av3-status-rows">
            <li>
              <span>Search Console</span>
              <strong className="av3-status-rows__soft">{seoLabel}</strong>
            </li>
            <li>
              <span>SEO health</span>
              <strong>
                {health?.state === "healthy"
                  ? "Stable"
                  : health?.state === "critical"
                    ? "Needs review"
                    : "Watch"}
              </strong>
            </li>
            <li>
              <span>Top story / district</span>
              <strong className="av3-status-rows__soft">
                {topStory ?? "No ranking sample yet"}
              </strong>
            </li>
          </ul>
          <Link href="/admin/business" className="av3-panel-link">
            Open Business
          </Link>
        </Av3Panel>

        <Av3Panel title="Platform pulse" subtitle="Reliability">
          <ul className="av3-status-rows">
            <li>
              <span>Overall health</span>
              <strong>{health?.label ?? "Unknown"}</strong>
            </li>
            <li>
              <span>Critical issues</span>
              <strong>{health?.criticalCount ?? 0}</strong>
            </li>
            <li>
              <span>Ingestion</span>
              <strong>
                {ingestionFailures > 0
                  ? `${ingestionFailures} failure${ingestionFailures === 1 ? "" : "s"}`
                  : "Stable"}
              </strong>
            </li>
          </ul>
          <Link href="/admin/technical" className="av3-panel-link">
            Open Platform
          </Link>
        </Av3Panel>
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
    </Av3Stack>
  );
}
