"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StatusTone = "ok" | "warn" | "crit" | "neutral";

type StatusRow = {
  label: string;
  value: string;
  tone: StatusTone;
  detail: string;
  href?: string;
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function PlatformOverviewDashboard() {
  const [loading, setLoading] = useState(true);
  const [overall, setOverall] = useState<{ label: string; tone: StatusTone }>({
    label: "Checking…",
    tone: "neutral",
  });
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [incidents, setIncidents] = useState<
    Array<{ title: string; when: string; href: string }>
  >([]);
  const [build, setBuild] = useState<string>("—");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/ops/health", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) {
            setError("Platform health API unavailable for this session.");
            setLoading(false);
          }
          return;
        }
        const json = await res.json();
        if (cancelled) return;

        const status = String(json.status ?? (json.ok ? "healthy" : "unhealthy"));
        setOverall({
          label:
            status === "healthy"
              ? "Operating normally"
              : status === "degraded"
                ? "Degraded"
                : "Needs attention",
          tone:
            status === "healthy" ? "ok" : status === "degraded" ? "warn" : "crit",
        });

        const q = asRecord(json.queueAnalytics);
        const totals = asRecord(q.totals);
        const pending = Number(totals.pending ?? q.pending ?? 0) || 0;
        const dead =
          Number(totals.deadLetter ?? totals.dead_letter ?? q.deadLetter ?? 0) || 0;

        const caching = asRecord(json.caching);
        const buildInfo = asRecord(json.build);
        setBuild(
          String(
            buildInfo.sha?.toString().slice(0, 7) ||
              buildInfo.version ||
              buildInfo.commit ||
              "—"
          )
        );

        const checks: unknown[] = Array.isArray(json.checks) ? json.checks : [];
        const dbCheck = asRecord(
          checks.find((c) => String(asRecord(c).name ?? "").toLowerCase().includes("database"))
        );
        const supabaseCheck = asRecord(
          checks.find((c) => String(asRecord(c).name ?? "").toLowerCase().includes("supabase"))
        );

        const nextRows: StatusRow[] = [
          {
            label: "Database",
            value: dbCheck.status ? String(dbCheck.status) : "Unknown",
            tone: toneFrom(dbCheck.status),
            detail: "Connectivity and query path",
            href: "/admin/schema",
          },
          {
            label: "Supabase",
            value: supabaseCheck.status
              ? String(supabaseCheck.status)
              : caching.redis != null
                ? "Configured"
                : "Unknown",
            tone: toneFrom(supabaseCheck.status),
            detail: "Auth and data plane",
            href: "/admin/health",
          },
          {
            label: "Worker queue",
            value: `${pending} pending`,
            tone: pending > 150 ? "crit" : pending > 50 ? "warn" : "ok",
            detail: "Jobs waiting for processing",
            href: "/admin/system",
          },
          {
            label: "Dead letters",
            value: String(dead),
            tone: dead > 0 ? "warn" : "ok",
            detail: "Failed jobs needing remediation",
            href: "/admin/system",
          },
          {
            label: "Redis cache",
            value: caching.redis ? "Connected" : "Not configured",
            tone: caching.redis ? "ok" : "neutral",
            detail: "Dashboard and intelligence cache",
            href: "/admin/health",
          },
          {
            label: "Cron monitor",
            value: json.cron ? "Tracked" : "Unavailable",
            tone: json.cron ? "ok" : "neutral",
            detail: "Scheduled job heartbeat state",
            href: "/admin/system",
          },
        ];
        setRows(nextRows);

        const recent = Array.isArray(json.recentErrors) ? json.recentErrors : [];
        setIncidents(
          recent.slice(0, 6).map((raw: Record<string, unknown>) => ({
            title: String(raw.message ?? "Operational error").slice(0, 100),
            when: String(raw.created_at ?? raw.timestamp ?? ""),
            href: "/admin/health",
          }))
        );
      } catch {
        if (!cancelled) setError("Unable to load platform health.");
      } finally {
        if (!cancelled) setLoading(false);
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
        <div className="anr-skeleton-block" style={{ height: 88 }} />
        <div className="anr-kpi-strip" style={{ marginTop: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="anr-kpi-compact anr-skeleton-block" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="anr-empty">
        <p>{error}</p>
        <p className="anr-meta">Retry from Health details if you have monitoring access.</p>
        <Link href="/admin/health" className="anr-text-link">
          Open health details
        </Link>
      </div>
    );
  }

  return (
    <div className="anr-dash">
      <section className={`anr-status-hero anr-status-hero--${overall.tone}`}>
        <div>
          <p className="anr-meta">Platform status</p>
          <h2>{overall.label}</h2>
          <p className="anr-meta">Deployment {build}</p>
        </div>
        <Link href="/admin/health" className="anr-btn anr-btn--primary">
          Health details
        </Link>
      </section>

      <div className="anr-kpi-strip">
        {rows.map((row) => (
          <article key={row.label} className={`anr-kpi-compact anr-kpi-compact--${row.tone}`}>
            <p className="anr-meta">{row.label}</p>
            <strong>{row.value}</strong>
            <p className="anr-kpi-compact__hint">{row.detail}</p>
            {row.href ? (
              <Link href={row.href} className="anr-text-link">
                Inspect
              </Link>
            ) : null}
          </article>
        ))}
      </div>

      <div className="anr-dash-grid">
        <section className="anr-panel">
          <header className="anr-panel__head">
            <h2>Recent incidents</h2>
            <Link href="/admin/health" className="anr-text-link">
              All errors
            </Link>
          </header>
          {incidents.length === 0 ? (
            <div className="anr-empty">
              <p>No recent ops errors in the feed.</p>
            </div>
          ) : (
            <ul className="anr-dense-list">
              {incidents.map((i, idx) => (
                <li key={`${i.title}-${idx}`}>
                  <Link href={i.href}>{i.title}</Link>
                  <em>
                    {i.when
                      ? new Date(i.when).toLocaleString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })
                      : ""}
                  </em>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="anr-panel">
          <header className="anr-panel__head">
            <h2>Operations shortcuts</h2>
          </header>
          <div className="anr-quick-actions">
            <Link href="/admin/system">Pipeline & workers</Link>
            <Link href="/admin/ingestion">Ingestion</Link>
            <Link href="/admin/schema">Database & schema</Link>
            <Link href="/admin/health">Health details</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function toneFrom(status: unknown): StatusTone {
  const s = String(status ?? "").toLowerCase();
  if (s.includes("healthy") || s === "ok" || s === "pass") return "ok";
  if (s.includes("degrad") || s.includes("warn")) return "warn";
  if (s.includes("fail") || s.includes("unhealthy") || s.includes("error")) return "crit";
  return "neutral";
}
