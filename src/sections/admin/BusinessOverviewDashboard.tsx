"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Kpi = {
  label: string;
  value: string;
  hint: string;
  href?: string;
  available: boolean;
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
  if (typeof r.inr === "number") return `₹${r.inr.toLocaleString("en-IN")}`;
  if (typeof r.usd === "number") return `$${r.usd.toFixed(2)}`;
  return "—";
}

export function BusinessOverviewDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [topStories, setTopStories] = useState<
    Array<{ title: string; href?: string; metric?: string }>
  >([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const nextKpis: Kpi[] = [];
      const nextNotes: string[] = [];
      const nextErrors: string[] = [];
      const nextStories: Array<{ title: string; href?: string; metric?: string }> = [];

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
          nextKpis.push({
            label: "Visitors (7d)",
            value: fmt(summary.visitors ?? summary.uniqueVisitors ?? summary.users),
            hint: "Audience analytics",
            href: "/admin/analytics",
            available: Number.isFinite(Number(summary.visitors ?? summary.uniqueVisitors ?? summary.users)),
          });
          nextKpis.push({
            label: "Page views (7d)",
            value: fmt(summary.pageViews ?? summary.views ?? summary.sessions),
            hint: "Traffic pulse",
            href: "/admin/analytics",
            available: Number.isFinite(
              Number(summary.pageViews ?? summary.views ?? summary.sessions)
            ),
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
              href: s.slug ? `/admin/stories` : "/admin/analytics",
              metric: fmt(s.views ?? s.pageViews ?? s.count),
            });
          }
        } catch {
          nextErrors.push("Audience analytics response could not be parsed.");
        }
      } else {
        nextKpis.push({
          label: "Visitors (7d)",
          value: "—",
          hint: "Analytics unavailable",
          href: "/admin/analytics",
          available: false,
        });
        nextNotes.push("Audience data needs analytics aggregation to be available.");
      }

      if (execRes.status === "fulfilled" && execRes.value.ok) {
        try {
          const json = await execRes.value.json();
          const dash = asRecord(json.dashboard);
          const overview = asRecord(dash.overview);
          const kpisBlock = asRecord(dash.businessKpis);
          nextKpis.push({
            label: "AI spend today",
            value: money(overview.todaySpend),
            hint: "Costs & budgets",
            href: "/admin/executive",
            available: Boolean(overview.todaySpend),
          });
          nextKpis.push({
            label: "Budget remaining",
            value: money(overview.budgetRemaining),
            hint: "Monthly budget",
            href: "/admin/executive",
            available: Boolean(overview.budgetRemaining),
          });
          nextKpis.push({
            label: "Published today",
            value: fmt(kpisBlock.publishedToday),
            hint: "Publishing velocity",
            href: "/admin/articles",
            available: Number.isFinite(Number(kpisBlock.publishedToday)),
          });
        } catch {
          nextErrors.push("Cost dashboard response could not be parsed.");
        }
      } else {
        nextNotes.push("AI cost metrics require monitoring access and finance instrumentation.");
      }

      if (seoRes.status === "fulfilled" && seoRes.value.ok) {
        try {
          const json = await seoRes.value.json();
          const data = asRecord(json.data ?? json.summary ?? json);
          const indexed = data.indexedPages ?? data.indexed ?? data.coverage;
          const health = data.seoHealthScore ?? data.healthScore ?? data.score;
          nextKpis.push({
            label: "SEO health",
            value: Number.isFinite(Number(health)) ? `${Math.round(Number(health))}` : "—",
            hint: "Search Console",
            href: "/admin/seo/search-console",
            available: Number.isFinite(Number(health)),
          });
          nextKpis.push({
            label: "Indexed pages",
            value: fmt(indexed),
            hint: "Coverage",
            href: "/admin/seo/search-console",
            available: Number.isFinite(Number(indexed)),
          });
        } catch {
          nextNotes.push("SEO summary available in Search Console detail.");
        }
      } else {
        nextKpis.push({
          label: "SEO health",
          value: "—",
          hint: "Open Search Console",
          href: "/admin/seo/search-console",
          available: false,
        });
        nextNotes.push("Connect or open Search Console for live SEO health.");
      }

      if (!cancelled) {
        setKpis(nextKpis);
        setTopStories(nextStories);
        setNotes(nextNotes);
        setErrors(nextErrors);
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
      <div className="anr-dash">
        <div className="anr-kpi-strip">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="anr-kpi-compact anr-skeleton-block" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="anr-dash">
      <div className="anr-kpi-strip">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className={`anr-kpi-compact ${kpi.available ? "" : "anr-kpi-compact--empty"}`}
          >
            <p className="anr-meta">{kpi.label}</p>
            <strong>{kpi.value}</strong>
            <p className="anr-kpi-compact__hint">{kpi.hint}</p>
            {kpi.href ? (
              <Link href={kpi.href} className="anr-text-link">
                Open
              </Link>
            ) : null}
          </article>
        ))}
      </div>

      <div className="anr-dash-grid">
        <section className="anr-panel">
          <header className="anr-panel__head">
            <h2>Top-performing stories</h2>
            <Link href="/admin/analytics" className="anr-text-link">
              Audience
            </Link>
          </header>
          {topStories.length === 0 ? (
            <div className="anr-empty">
              <p>No story performance rows yet.</p>
              <p className="anr-meta">Open Audience analytics when events are flowing.</p>
            </div>
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
        </section>

        <section className="anr-panel">
          <header className="anr-panel__head">
            <h2>Business actions</h2>
          </header>
          <div className="anr-quick-actions">
            <Link href="/admin/seo/search-console">Search Console</Link>
            <Link href="/admin/seo/rankings">Rankings</Link>
            <Link href="/admin/seo/competitors">Competitors</Link>
            <Link href="/admin/seo/intelligence">SEO intelligence</Link>
            <Link href="/admin/billing">Revenue</Link>
            <Link href="/admin/executive">AI costs</Link>
          </div>
          {notes.length > 0 ? (
            <ul className="anr-note-list">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
          {errors.map((e) => (
            <p key={e} className="anr-error">
              {e}
            </p>
          ))}
        </section>
      </div>
    </div>
  );
}
