"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GscDashboard } from "@/lib/gsc-intelligence/types";
import {
  Av3DataTable,
  Av3EmptyState,
  Av3Metric,
  Av3MetricGrid,
  Av3Panel,
  Av3SkeletonGrid,
  Av3Stack,
} from "@/components/admin-v3";

type MetricDef = {
  label: string;
  value: string;
  hint: string;
  available: boolean;
  source?: string;
  setupHref?: string;
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function fmt(n: unknown): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("en-IN");
}

function money(v: unknown): string {
  const r = asRecord(v);
  if (typeof r.display === "string") return r.display;
  if (typeof r.usdLabel === "string") return r.usdLabel;
  if (typeof r.inr === "number") return `₹${r.inr.toLocaleString("en-IN")}`;
  if (typeof r.usd === "number") return `$${r.usd.toFixed(2)}`;
  return "—";
}

function unavailableMetric(label: string, source: string, setupHref: string, hint: string): MetricDef {
  return { label, value: "Unavailable", hint, available: false, source, setupHref };
}

export function BusinessOverviewDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricDef[]>([]);
  const [topStories, setTopStories] = useState<Array<{ title: string; metric?: string }>>([]);
  const [seoOpportunities, setSeoOpportunities] = useState<Array<{ title: string; reason: string }>>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const nextMetrics: MetricDef[] = [];
      const nextStories: Array<{ title: string; metric?: string }> = [];
      const nextSeo: Array<{ title: string; reason: string }> = [];

      const [analyticsRes, execRes, seoRes] = await Promise.allSettled([
        fetch("/api/analytics/dashboard?hours=168", { credentials: "include" }),
        fetch("/api/admin/ops/executive", { credentials: "include" }),
        fetch("/api/admin/seo/search-console", { credentials: "include" }),
      ]);

      if (analyticsRes.status === "fulfilled" && analyticsRes.value.ok) {
        try {
          const json = await analyticsRes.value.json();
          const report = asRecord(json.report);
          const summary = asRecord(report.summary ?? report.totals ?? report);
          const visitors = summary.visitors ?? summary.uniqueVisitors ?? summary.users;
          const pageViews = summary.pageViews ?? summary.views ?? summary.sessions;
          nextMetrics.push({
            label: "Visitors (7d)",
            value: fmt(visitors),
            hint: "Audience analytics",
            available: Number.isFinite(Number(visitors)),
          });
          nextMetrics.push({
            label: "Page views (7d)",
            value: fmt(pageViews),
            hint: "Traffic pulse",
            available: Number.isFinite(Number(pageViews)),
          });
          const stories = Array.isArray(report.topStories)
            ? report.topStories
            : Array.isArray(report.topPages)
              ? report.topPages
              : [];
          for (const raw of stories.slice(0, 5)) {
            const s = asRecord(raw);
            nextStories.push({
              title: String(s.title ?? s.headline ?? s.path ?? "Story"),
              metric: fmt(s.views ?? s.pageViews ?? s.count),
            });
          }
        } catch {
          nextMetrics.push(
            unavailableMetric("Visitors (7d)", "Audience analytics", "/admin/analytics", "Response could not be parsed")
          );
        }
      } else {
        nextMetrics.push(
          unavailableMetric("Visitors (7d)", "Audience analytics", "/admin/analytics", "Aggregation not available")
        );
        nextMetrics.push(
          unavailableMetric("Page views (7d)", "Audience analytics", "/admin/analytics", "Aggregation not available")
        );
      }

      if (execRes.status === "fulfilled" && execRes.value.ok) {
        try {
          const json = await execRes.value.json();
          const dash = asRecord(json.dashboard);
          const overview = asRecord(dash.overview);
          const kpisBlock = asRecord(dash.businessKpis);
          nextMetrics.push({
            label: "AI spend today",
            value: money(overview.todaySpend),
            hint: "Executive cost dashboard",
            available: Boolean(overview.todaySpend),
            setupHref: "/admin/executive",
          });
          nextMetrics.push({
            label: "Budget remaining",
            value: money(overview.budgetRemaining),
            hint: "Monthly AI budget",
            available: Boolean(overview.budgetRemaining),
            setupHref: "/admin/executive",
          });
          nextMetrics.push({
            label: "Published today",
            value: fmt(kpisBlock.publishedToday),
            hint: "Publishing velocity",
            available: Number.isFinite(Number(kpisBlock.publishedToday)),
          });
        } catch {
          nextMetrics.push(
            unavailableMetric("AI spend today", "Executive costs", "/admin/executive", "Finance payload unavailable")
          );
        }
      } else {
        nextMetrics.push(
          unavailableMetric("AI spend today", "Executive costs", "/admin/executive", "Requires monitoring access")
        );
      }

      if (seoRes.status === "fulfilled" && seoRes.value.ok) {
        try {
          const json = await seoRes.value.json();
          const dashboard = json.dashboard as GscDashboard | undefined;
          if (dashboard) {
            const indexed = dashboard.indexHealth?.indexed_pages;
            nextMetrics.push({
              label: "Search clicks (28d)",
              value: dashboard.clicks.toLocaleString(),
              hint: "Search Console",
              available: true,
            });
            nextMetrics.push({
              label: "Search impressions",
              value: dashboard.impressions.toLocaleString(),
              hint: "Search Console",
              available: true,
            });
            nextMetrics.push({
              label: "Search CTR",
              value: `${dashboard.ctr}%`,
              hint: "Average CTR",
              available: true,
            });
            if (indexed != null) {
              nextMetrics.push({
                label: "Indexed pages",
                value: fmt(indexed),
                hint: "Coverage estimate",
                available: true,
              });
            }
            for (const rec of dashboard.ctrOpportunities.slice(0, 5)) {
              nextSeo.push({ title: rec.title, reason: rec.reason });
            }
          }
        } catch {
          nextMetrics.push(
            unavailableMetric("Search CTR", "Search Console", "/admin/seo/search-console", "GSC summary unavailable")
          );
        }
      } else {
        nextMetrics.push(
          unavailableMetric(
            "Search CTR",
            "Search Console",
            "/admin/seo/search-console",
            "Connect Search Console credentials"
          )
        );
      }

      if (!cancelled) {
        setMetrics(nextMetrics);
        setTopStories(nextStories);
        setSeoOpportunities(nextSeo);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Av3Stack>
        <Av3SkeletonGrid count={6} />
      </Av3Stack>
    );
  }

  return (
    <Av3Stack>
      <Av3MetricGrid>
        {metrics.map((metric) => (
          <Av3Metric
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={
              !metric.available && metric.setupHref ? (
                <>
                  {metric.hint}{" "}
                  <Link href={metric.setupHref} className="anr-text-link">
                    Open setup{metric.source ? ` (${metric.source})` : ""}
                  </Link>
                </>
              ) : (
                metric.hint
              )
            }
          />
        ))}
      </Av3MetricGrid>

      <div className="anr-dash-grid">
        <Av3Panel
          title="Top-performing stories"
          subtitle="Audience leaders this week"
          action={
            <Link href="/admin/analytics" className="anr-text-link">
              Audience
            </Link>
          }
        >
          {topStories.length === 0 ? (
            <Av3EmptyState
              title="No story performance rows yet"
              message="Audience analytics will populate when events are flowing."
              action={
                <Link href="/admin/analytics" className="anr-text-link">
                  Open setup (Audience analytics)
                </Link>
              }
            />
          ) : (
            <ul className="anr-dense-list">
              {topStories.map((s, i) => (
                <li key={`${s.title}-${i}`}>
                  <span>{s.title}</span>
                  <em>{s.metric ?? "—"}</em>
                </li>
              ))}
            </ul>
          )}
        </Av3Panel>

        <Av3Panel title="SEO opportunities" subtitle="Search Console recommendations">
          {seoOpportunities.length === 0 ? (
            <Av3EmptyState
              title="No SEO actions queued"
              message="CTR opportunities appear after Search Console sync."
              action={
                <Link href="/admin/seo/search-console" className="anr-text-link">
                  Open setup (Search Console)
                </Link>
              }
            />
          ) : (
            <Av3DataTable
              columns={[
                { key: "title", header: "Action", render: (row) => row.title },
                { key: "reason", header: "Reason", truncate: true, render: (row) => row.reason },
              ]}
              rows={seoOpportunities}
              rowKey={(row, i) => `${row.title}-${i}`}
            />
          )}
        </Av3Panel>
      </div>
    </Av3Stack>
  );
}
