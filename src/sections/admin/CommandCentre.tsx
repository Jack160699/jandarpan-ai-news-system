"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function money(v: unknown): string {
  const r = asRecord(v);
  if (typeof r.display === "string") return r.display;
  if (typeof r.inr === "number") return `₹${r.inr.toLocaleString("en-IN")}`;
  if (typeof r.usd === "number") return `$${r.usd.toFixed(2)}`;
  return "—";
}

export function CommandCentre() {
  const { data, loading, error } = useAdminNewsroom();
  const [costToday, setCostToday] = useState<string>("—");
  const [platformTone, setPlatformTone] = useState<"ok" | "warn" | "crit" | "neutral">(
    "neutral"
  );
  const [platformLabel, setPlatformLabel] = useState("Checking platform…");

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

  const queueDepth = useMemo(() => {
    const q = Array.isArray(data?.aiQueue) ? data.aiQueue : [];
    return q.length;
  }, [data]);

  const failedQueue = useMemo(() => {
    const q = Array.isArray(data?.aiQueue) ? data.aiQueue : [];
    return q.filter((item) => Boolean(item.error)).length;
  }, [data]);

  const ingestionFailures = useMemo(() => {
    const f = data?.ingestion?.recentFailures;
    return Array.isArray(f) ? f.length : 0;
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    async function loadExtras() {
      const [execRes, healthRes] = await Promise.allSettled([
        fetch("/api/admin/ops/executive", { credentials: "include" }),
        fetch("/api/admin/ops/health", { credentials: "include" }),
      ]);
      if (cancelled) return;
      if (execRes.status === "fulfilled" && execRes.value.ok) {
        try {
          const json = await execRes.value.json();
          const overview = asRecord(asRecord(json.dashboard).overview);
          setCostToday(money(overview.todaySpend));
        } catch {
          /* keep placeholder */
        }
      }
      if (healthRes.status === "fulfilled" && healthRes.value.ok) {
        try {
          const json = await healthRes.value.json();
          const status = String(json.status ?? (json.ok ? "healthy" : "unhealthy"));
          if (status === "healthy") {
            setPlatformTone("ok");
            setPlatformLabel("Platform healthy");
          } else if (status === "degraded") {
            setPlatformTone("warn");
            setPlatformLabel("Platform degraded");
          } else {
            setPlatformTone("crit");
            setPlatformLabel("Platform needs attention");
          }
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
    const items: Array<{ label: string; href: string; count: number }> = [];
    if (pending > 0) {
      items.push({ label: "Stories waiting for review", href: "/admin/stories", count: pending });
    }
    if (failedQueue > 0) {
      items.push({ label: "AI queue failures", href: "/admin/system", count: failedQueue });
    }
    if (queueDepth > 20) {
      items.push({ label: "Queue backlog", href: "/admin/technical", count: queueDepth });
    }
    if (ingestionFailures > 0) {
      items.push({
        label: "Ingestion failures",
        href: "/admin/ingestion",
        count: ingestionFailures,
      });
    }
    return items;
  }, [pending, failedQueue, queueDepth, ingestionFailures]);

  if (loading && !data) {
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

  if (error && !data) {
    return <EmptyState title="Command centre unavailable" description={error} />;
  }

  return (
    <div className="anr-dash">
      <section className={`anr-status-hero anr-status-hero--${platformTone}`}>
        <div>
          <p className="anr-meta">Overall system state</p>
          <h2>{platformLabel}</h2>
          <p className="anr-cc-hero__summary">
            {publishedToday} published today · {pending} awaiting review · queue {queueDepth}
          </p>
          {data?.fetchedAt ? (
            <p className="anr-meta">
              Editorial snapshot <ClientTime iso={data.fetchedAt} preset="time" />
            </p>
          ) : null}
        </div>
        <div className="anr-quick-actions">
          <Link href="/admin/stories">Review stories</Link>
          <Link href="/admin/business">Business</Link>
          <Link href="/admin/technical">Platform</Link>
        </div>
      </section>

      <div className="anr-kpi-strip">
        <article className="anr-kpi-compact">
          <p className="anr-meta">Published today</p>
          <strong>{publishedToday}</strong>
          <p className="anr-kpi-compact__hint">Live on the site</p>
        </article>
        <article className="anr-kpi-compact">
          <p className="anr-meta">Needs attention</p>
          <strong>{attention.reduce((n, i) => n + i.count, 0)}</strong>
          <p className="anr-kpi-compact__hint">Editorial + pipeline</p>
        </article>
        <article className="anr-kpi-compact">
          <p className="anr-meta">Pipeline queue</p>
          <strong>{queueDepth}</strong>
          <p className="anr-kpi-compact__hint">AI jobs waiting</p>
        </article>
        <article className="anr-kpi-compact">
          <p className="anr-meta">Ingestion failures</p>
          <strong>{ingestionFailures}</strong>
          <p className="anr-kpi-compact__hint">Recent source failures</p>
        </article>
        <article className="anr-kpi-compact">
          <p className="anr-meta">AI spend today</p>
          <strong>{costToday}</strong>
          <p className="anr-kpi-compact__hint">
            {costToday === "—" ? "Open costs if unavailable" : "From finance dashboard"}
          </p>
          <Link href="/admin/executive" className="anr-text-link">
            Costs
          </Link>
        </article>
        <article className="anr-kpi-compact">
          <p className="anr-meta">Traffic & SEO</p>
          <strong>—</strong>
          <p className="anr-kpi-compact__hint">Open Business for live metrics</p>
          <Link href="/admin/business" className="anr-text-link">
            Business
          </Link>
        </article>
      </div>

      <div className="anr-dash-grid">
        <section className="anr-panel">
          <header className="anr-panel__head">
            <h2>Needs attention now</h2>
          </header>
          {attention.length === 0 ? (
            <div className="anr-empty">
              <p>Nothing urgent in the editorial snapshot.</p>
            </div>
          ) : (
            <ul className="anr-dense-list">
              {attention.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                  <em>{item.count}</em>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="anr-panel">
          <header className="anr-panel__head">
            <h2>Deep links</h2>
          </header>
          <div className="anr-quick-actions">
            <Link href="/admin/editorial">Editorial home</Link>
            <Link href="/admin/live-wire">Breaking & live</Link>
            <Link href="/admin/seo/search-console">Search Console</Link>
            <Link href="/admin/ingestion">Ingestion</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
