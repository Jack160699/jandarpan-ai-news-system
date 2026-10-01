"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Av3DataTable,
  Av3EmptyState,
  Av3Panel,
  Av3StatusBadge,
  Av3Tabs,
} from "@/components/admin-v3";
import { ageMinutes, FAILURE_CATEGORY_LABEL, formatAge, type FailureCategory } from "@/lib/admin-ops/health";
import type { OpsView } from "@/lib/admin-ops/snapshot";
import type { ArticlePerfRow, Tone } from "@/lib/admin-ops/types";

const nf = new Intl.NumberFormat("en-IN");
export const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : nf.format(n));

/** Deterministic on the server/first paint, then ticks — keeps timestamps hydration-safe. */
export function useNow(initialIso: string): number {
  const [now, setNow] = useState(() => new Date(initialIso).getTime());
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const ago = (iso: string | null | undefined, now: number) => formatAge(ageMinutes(iso, now));

export function ToneDot({ tone }: { tone: Tone }) {
  return <span className={`ops-dot ops-dot--${tone}`} aria-label={tone} />;
}

// ------------------------------------------------------------------ KPIs

export function KpiRow({ view }: { view: OpsView }) {
  const k = view.kpis;
  const lag = k.freshnessLagMinutes;
  const items: Array<{ label: string; value: string; hint?: string; tone: Tone | "neutral" }> = [
    { label: "Total users", value: fmt(k.totalUsers), hint: "registered accounts", tone: "neutral" },
    { label: "Active today", value: fmt(k.activeToday), hint: "unique users, IST day", tone: "neutral" },
    { label: "Active · 7 days", value: fmt(k.active7d), hint: "unique users", tone: "neutral" },
    { label: "New users · 30 days", value: fmt(k.new30d), hint: "registrations", tone: "neutral" },
    {
      label: "Published today",
      value: `${fmt(k.publishedToday)} / ${view.publishing.target}`,
      hint: view.publishing.pace.message,
      tone: view.publishing.pace.tone,
    },
    { label: "News signals today", value: fmt(k.signalsToday), hint: `${fmt(view.publishing.last_1h)} published last hour`, tone: k.signalsTone },
    {
      label: "Pending editorial queue",
      value: fmt(k.pendingEditorialQueue),
      hint: `fresh events awaiting an article · legacy AI queue ${fmt(k.legacyAiQueuePending)}`,
      tone: k.queueTone,
    },
    {
      label: "Freshness lag",
      value: lag === null ? "—" : formatAge(lag).replace(" ago", ""),
      hint: "since latest published story",
      tone: k.freshnessTone,
    },
  ];
  return (
    <div className="ops-kpis">
      {items.map((i) => (
        <article key={i.label} className={`ops-kpi ops-kpi--${i.tone}`}>
          <p className="ops-kpi__label">{i.label}</p>
          <p className="ops-kpi__value">{i.value}</p>
          {i.hint ? <p className="ops-kpi__hint">{i.hint}</p> : null}
        </article>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Freshness

export function FreshnessPanel({ view, now }: { view: OpsView; now: number }) {
  const p = view.publishing;
  const latest = p.latest;
  const lag = ageMinutes(latest?.published_at, now);
  const tone = view.kpis.freshnessTone;
  const pct = Math.min(100, Math.round((p.today / p.target) * 100));
  const markPct = Math.min(100, Math.round((p.pace.expectedByNow / p.target) * 100));
  return (
    <Av3Panel title="News freshness" subtitle="Is the newsroom publishing right now?">
      <div className="ops-fresh">
        <div className="ops-fresh__latest">
          <p className="ops-kpi__label">Latest published story</p>
          {latest ? (
            <>
              <a className="ops-fresh__headline" href={`/story/${latest.slug}`} target="_blank" rel="noreferrer">
                {latest.headline}
              </a>
              <span className="ops-kpi__hint">
                Published {ago(latest.published_at, now)} · {latest.language ?? "—"}
              </span>
              <span className={`ops-fresh__age ops-fresh__age--${tone}`}>{lag === null ? "—" : formatAge(lag).replace(" ago", "")}</span>
            </>
          ) : (
            <p>No published story found.</p>
          )}
        </div>
        <div style={{ display: "grid", gap: "0.8rem" }}>
          <div className={`ops-banner ops-banner--${p.pace.tone}`}>
            {p.pace.message} <span style={{ fontWeight: 400 }}>— {p.pace.detail}</span>
          </div>
          <div className="ops-pace">
            <span className="ops-pace__big">
              TODAY: {fmt(p.today)} / {p.target}
            </span>
            <span className="ops-kpi__hint">daily target {p.target} · ~{p.pace.expectedByNow} expected by now (IST)</span>
          </div>
          <div className="ops-progress" role="progressbar" aria-valuenow={p.today} aria-valuemin={0} aria-valuemax={p.target}>
            <div className={`ops-progress__bar ops-progress__bar--${p.pace.tone}`} style={{ width: `${pct}%` }} />
            <div className="ops-progress__mark" style={{ left: `${markPct}%` }} title="expected pace" />
          </div>
          <div className="ops-counters">
            <div className="ops-counter"><b>{fmt(p.last_1h)}</b><span>last hour</span></div>
            <div className="ops-counter"><b>{fmt(p.last_6h)}</b><span>last 6 hours</span></div>
            <div className="ops-counter"><b>{fmt(p.today)}</b><span>today</span></div>
          </div>
        </div>
      </div>
    </Av3Panel>
  );
}

// ------------------------------------------------------------------ Performance

type PerfTab = "views24" | "eng24" | "views7d" | "total";

export function PerformancePanel({ view }: { view: OpsView }) {
  const [tab, setTab] = useState<PerfTab>("views24");
  const perf = view.performance;
  const sets: Record<PerfTab, { rows: ArticlePerfRow[]; window: string; metric: (r: ArticlePerfRow) => string }> = {
    views24: { rows: perf.top_views_24h, window: "last 24 hours · by views", metric: (r) => fmt(r.views_24h) },
    eng24: { rows: perf.top_engagement_24h, window: "last 24 hours · by likes + comments", metric: (r) => fmt((r.likes_24h ?? 0) + (r.comments_24h ?? 0)) },
    views7d: { rows: perf.top_views_7d, window: "last 7 days · by views", metric: (r) => fmt(r.views_7d) },
    total: { rows: perf.top_total, window: "all time · by total views", metric: (r) => fmt(r.views_total) },
  };
  const cur = sets[tab];
  return (
    <Av3Panel
      title="Best performing articles"
      subtitle={`Metric window: ${cur.window}. Real articles only — ${perf.excluded_non_article_ids} non-article ids (ads / static items) excluded.`}
    >
      <Av3Tabs
        tabs={[
          { id: "views24", label: "Views · 24h" },
          { id: "eng24", label: "Engagement · 24h" },
          { id: "views7d", label: "Views · 7d" },
          { id: "total", label: "Total views" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as PerfTab)}
      />
      <div className="ops-table-scroll">
        <Av3DataTable
          rows={cur.rows}
          rowKey={(r) => r.id}
          empty={<Av3EmptyState title="No measured activity in this window" message="Views are counted from story_views_log; nothing has been recorded for this metric window." />}
          columns={[
            {
              key: "h",
              header: "Headline",
              render: (r) => (
                <a href={`/story/${r.slug}`} target="_blank" rel="noreferrer">
                  {r.headline}
                </a>
              ),
            },
            { key: "lang", header: "Lang", render: (r) => r.language ?? "—" },
            { key: "geo", header: "District / state", render: (r) => r.district ?? (r.scope ? r.scope.replaceAll("_", " ").toLowerCase() : "—") },
            { key: "pub", header: "Published", render: (r) => new Date(r.published_at).toISOString().slice(0, 16).replace("T", " ") + "Z" },
            { key: "m", header: tab === "eng24" ? "Engagement" : "Views", numeric: true, render: cur.metric },
            { key: "v", header: "Views 24h", numeric: true, render: (r) => fmt(r.views_24h) },
            { key: "l", header: "Likes", numeric: true, render: (r) => fmt(tab === "total" ? r.likes_total : tab === "views7d" ? r.likes_7d : r.likes_24h) },
            { key: "c", header: "Comments", numeric: true, render: (r) => fmt(tab === "total" ? r.comments_total : tab === "views7d" ? r.comments_7d : r.comments_24h) },
            {
              key: "er",
              header: "Eng. rate",
              numeric: true,
              render: (r) => {
                const views = tab === "total" ? r.views_total : tab === "views7d" ? r.views_7d : r.views_24h;
                const eng = tab === "total" ? r.likes_total + r.comments_total : tab === "views7d" ? r.likes_7d + r.comments_7d : r.likes_24h + r.comments_24h;
                return views ? `${((eng / views) * 100).toFixed(1)}%` : "—";
              },
            },
            { key: "s", header: "Source", render: (r) => r.source ?? "—" },
          ]}
        />
      </div>
    </Av3Panel>
  );
}

// ------------------------------------------------------------------ Ingestion health

export function SourcesPanel({ view, now }: { view: OpsView; now: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const summary = view.sourceSummary;
  const rows = view.sources.filter((s) => filter === "all" || s.status === filter);
  return (
    <Av3Panel
      title="Ingestion health"
      subtitle="Status is derived from timestamps and counters, not a stored label."
      action={
        <div className="ops-chips">
          <button className={`ops-chip ops-chip--btn ${filter === "all" ? "ops-chip--active" : ""}`} onClick={() => setFilter("all")}>
            all {view.sources.length}
          </button>
          {Object.entries(summary).map(([k, n]) => (
            <button key={k} className={`ops-chip ops-chip--btn ${filter === k ? "ops-chip--active" : ""}`} onClick={() => setFilter(k)}>
              {k.replaceAll("_", " ")} {n}
            </button>
          ))}
        </div>
      }
    >
      <div className="ops-table-scroll ops-table-scroll--tall">
        <table className="av3-table">
          <thead>
            <tr>
              <th>Source</th><th>Provider</th><th>Status</th><th>Last success</th><th>Last new item</th>
              <th className="av3-table__num">Items today</th><th className="av3-table__num">New</th>
              <th className="av3-table__num">Dupes</th><th className="av3-table__num">Failures</th><th>Quota</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <Fragment key={s.key}>
                <tr className="ops-clickable" onClick={() => setOpen(open === s.key ? null : s.key)}>
                  <td>{s.key}</td>
                  <td>{s.provider}</td>
                  <td><Av3StatusBadge label={s.statusLabel} tone={s.tone} /></td>
                  <td>{ago(s.lastSuccessAt, now)}</td>
                  <td>{ago(s.lastNewItemAt, now)}</td>
                  <td className="av3-table__num">{fmt(s.itemsToday)}</td>
                  <td className="av3-table__num">{fmt(s.newItemsToday)}</td>
                  <td className="av3-table__num">{fmt(s.duplicatesToday)}</td>
                  <td className="av3-table__num">{fmt(s.failuresToday)}</td>
                  <td>{s.quota}</td>
                </tr>
                {open === s.key ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="ops-detail">
                        <span><b>Why:</b> {s.reason}</span>
                        <span><b>Consecutive failures:</b> {s.consecutiveFailures} · <b>consecutive empty runs:</b> {s.consecutiveEmptyRuns}</span>
                        <span><b>Last success:</b> {s.lastSuccessAt ?? "never"} · <b>last new item:</b> {s.lastNewItemAt ?? "never"}</span>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {view.providerErrors.length ? (
        <details style={{ marginTop: "0.75rem" }}>
          <summary>Provider errors (24h)</summary>
          <ul>
            {view.providerErrors.map((e) => (
              <li key={e.error}>{e.error} — ×{e.n}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </Av3Panel>
  );
}

// ------------------------------------------------------------------ Funnel

export function FunnelPanel({ view }: { view: OpsView }) {
  const max = Math.max(1, ...view.funnel.map((f) => f.day));
  return (
    <Av3Panel title="Editorial pipeline funnel" subtitle="Where stories stop: fetched → published, last hour / today (IST) / last 24h.">
      <div className="ops-funnel">
        <div className="ops-funnel__row ops-funnel__head">
          <span>Stage</span><span />
          <span className="ops-num">1h</span><span className="ops-num">Today</span><span className="ops-num">24h</span>
        </div>
        {view.funnel.map((f, i) => {
          const prev = i > 0 ? view.funnel[i - 1]!.day : f.day;
          const drop = f.key !== "duplicates_removed" && i > 0 && prev > 0 && f.day / prev < 0.5;
          return (
            <div key={f.key} className={`ops-funnel__row ${drop ? "ops-funnel__row--drop" : ""}`}>
              <span>{f.label}</span>
              <span className="ops-funnel__track"><span className="ops-funnel__fill" style={{ display: "block", width: `${Math.round((f.day / max) * 100)}%` }} /></span>
              <span className="ops-num">{fmt(f.hour)}</span>
              <span className="ops-num">{fmt(f.today)}</span>
              <span className="ops-num">{fmt(f.day)}</span>
            </div>
          );
        })}
      </div>
    </Av3Panel>
  );
}

// ------------------------------------------------------------------ Geo

export function GeoPanel({ view, now }: { view: OpsView; now: number }) {
  const g = view.geo;
  const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : "—");
  const s = g.shares;
  return (
    <Av3Panel
      title="Chhattisgarh geo coverage"
      subtitle={`Published in the last 24h (${s.total}). District coverage counts only evidence-based (scope-classified) stories; ${g.legacyUnverified} legacy rows with an unverified district tag are not counted.`}
    >
      <div className="ops-shares">
        <div className="ops-share"><b>{pct(s.chhattisgarh, s.total)}</b><span>Chhattisgarh share</span></div>
        <div className="ops-share"><b>{pct(s.districtTagged, s.total)}</b><span>District-tagged</span></div>
        <div className="ops-share"><b>{pct(s.statewide, s.total)}</b><span>Statewide</span></div>
        <div className="ops-share"><b>{pct(s.unknown, s.total)}</b><span>Unknown geo</span></div>
        <div className="ops-share"><b>{pct(s.national, s.total)}</b><span>National spillover</span></div>
        <div className="ops-share"><b>{pct(s.international, s.total)}</b><span>International spillover</span></div>
      </div>
      <details style={{ marginTop: "0.9rem" }} open>
        <summary>Districts ({g.districts.filter((d) => d.status === "none").length} with no verified coverage in 7 days)</summary>
        <div className="ops-table-scroll">
          <Av3DataTable
            rows={g.districts}
            rowKey={(d) => d.slug}
            columns={[
              { key: "d", header: "District", render: (d) => `${d.name} · ${d.nameHi}` },
              { key: "t", header: "Tier", render: (d) => d.tier },
              { key: "n", header: "Today", numeric: true, render: (d) => fmt(d.today) },
              { key: "w", header: "7 days", numeric: true, render: (d) => fmt(d.last7d) },
              { key: "l", header: "Latest", render: (d) => ago(d.latestAt, now) },
              {
                key: "s",
                header: "Coverage",
                render: (d) => (
                  <Av3StatusBadge label={d.status === "covered" ? "Covered" : d.status === "stale" ? "Stale" : "No coverage"} tone={d.tone} />
                ),
              },
            ]}
          />
        </div>
      </details>
    </Av3Panel>
  );
}

// ------------------------------------------------------------------ Language

export function LanguagePanel({ view }: { view: OpsView }) {
  const l = view.language;
  const hi = l.today.hi ?? 0;
  const en = l.today.en ?? 0;
  return (
    <Av3Panel title="Language health" subtitle="Exact counts from the database (IST day).">
      <div className="ops-shares">
        <div className="ops-share"><b>{fmt(hi)}</b><span>Hindi today</span></div>
        <div className="ops-share"><b>{fmt(en)}</b><span>English today</span></div>
        <div className="ops-share"><b>{fmt(l.script_mismatch_published)}</b><span>Script mismatch (30d, published)</span></div>
        <div className="ops-share"><b>{fmt(l.gate_failures_24h)}</b><span>Validation failures 24h</span></div>
        <div className="ops-share"><b>{fmt(l.untranslated_today)}</b><span>Untranslated today</span></div>
        <div className="ops-share"><b>{l.cross_language_duplicates === null ? "n/a" : fmt(l.cross_language_duplicates)}</b><span>Cross-language duplicates</span></div>
      </div>
      {Object.keys(l.gate_failure_codes_24h ?? {}).length ? (
        <p className="ops-kpi__hint" style={{ marginTop: "0.6rem" }}>
          Gate codes (24h): {Object.entries(l.gate_failure_codes_24h).map(([k, n]) => `${k} ×${n}`).join(" · ")}
        </p>
      ) : null}
    </Av3Panel>
  );
}

// ------------------------------------------------------------------ Failure center

type Drill = { kind: string; id: string; title: string | null; reason: string; status: string | null; at: string | null; href?: string };

export function FailurePanel({ view }: { view: OpsView }) {
  const [open, setOpen] = useState<FailureCategory | null>(null);
  const [drill, setDrill] = useState<Record<string, Drill[] | "loading" | "error">>({});
  const q = view.queue.ai_queue;
  const wj = (status: string) => view.queue.worker_jobs.filter((w) => w.status === status).reduce((a, w) => a + w.n, 0);

  async function load(category: FailureCategory) {
    setOpen(open === category ? null : category);
    if (drill[category] && drill[category] !== "error") return;
    setDrill((d) => ({ ...d, [category]: "loading" }));
    try {
      const res = await fetch(`/api/admin/ops/failures?category=${category}`, { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; rows?: Drill[] };
      setDrill((d) => ({ ...d, [category]: json.ok ? (json.rows ?? []) : "error" }));
    } catch {
      setDrill((d) => ({ ...d, [category]: "error" }));
    }
  }

  return (
    <Av3Panel title="Queue & failure center" subtitle="Click a category to open the underlying jobs and articles.">
      <div className="ops-shares" style={{ marginBottom: "0.9rem" }}>
        <div className="ops-share"><b>{fmt(q.pending ?? 0)}</b><span>Pending (AI queue)</span></div>
        <div className="ops-share"><b>{fmt(q.processing ?? 0)}</b><span>Processing</span></div>
        <div className="ops-share"><b>{fmt(q.completed ?? 0)}</b><span>Completed</span></div>
        <div className="ops-share"><b>{fmt((q.failed ?? 0) + wj("failed"))}</b><span>Failed</span></div>
        <div className="ops-share"><b>{fmt((q.dead ?? 0) + wj("dead"))}</b><span>Dead</span></div>
        <div className="ops-share"><b>{fmt(q.quarantined ?? 0)}</b><span>Quarantined</span></div>
        <div className="ops-share"><b>{fmt(Object.entries(q).filter(([k]) => k.startsWith("rejected_")).reduce((a, [, n]) => a + n, 0))}</b><span>Rejected (stale/dup/geo/quality)</span></div>
      </div>
      {/* The six classes: a gate saying "no" or an empty shard must never read as an infrastructure outage. */}
      <div className="ops-shares" style={{ marginBottom: "0.9rem" }} data-testid="failure-classes">
        {view.failureClasses.map((c) => (
          <div key={c.klass} className="ops-share" data-class={c.klass}>
            <b style={c.klass === "infrastructure" && c.total > 0 ? { color: "var(--anr-danger,#b91c1c)" } : undefined}>{fmt(c.total)}</b>
            <span>{c.label}</span>
          </div>
        ))}
      </div>
      {view.failures.length === 0 ? (
        <Av3EmptyState title="No failures recorded" message="No failed jobs, rejections or provider errors in the measured windows." />
      ) : (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {view.failures.map((g) => (
            <div key={g.category}>
              <button className="ops-btn" style={{ width: "100%", display: "flex", justifyContent: "space-between" }} onClick={() => void load(g.category)}>
                <span>{FAILURE_CATEGORY_LABEL[g.category]}</span>
                <span>{fmt(g.total)}</span>
              </button>
              {open === g.category ? (
                <div className="ops-detail" style={{ marginTop: "0.35rem" }}>
                  {g.items.slice(0, 6).map((i) => (
                    <span key={`${i.source}-${i.reason}`}>{i.source} · {i.reason} — ×{i.n}</span>
                  ))}
                  <hr style={{ border: 0, borderTop: "1px solid var(--anr-border,#cbd5e1)", width: "100%" }} />
                  {drill[g.category] === "loading" ? <span>Loading underlying items…</span> : null}
                  {drill[g.category] === "error" ? <span>Could not load underlying items.</span> : null}
                  {Array.isArray(drill[g.category]) && (drill[g.category] as Drill[]).length === 0 ? <span>No underlying rows in the retained window.</span> : null}
                  {Array.isArray(drill[g.category])
                    ? (drill[g.category] as Drill[]).slice(0, 25).map((r) => (
                        <span key={`${r.kind}-${r.id}`}>
                          <b>{r.kind.replace("_", " ")}</b> ·{" "}
                          {r.href ? <a href={r.href}>{r.title ?? r.id}</a> : r.title ?? r.id} — {r.reason.slice(0, 120)}
                          {r.status ? ` [${r.status}]` : ""}
                        </span>
                      ))
                    : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Av3Panel>
  );
}

// ------------------------------------------------------------------ System health

export function SubsystemPanel({ view, now }: { view: OpsView; now: number }) {
  return (
    <Av3Panel title="System health" subtitle="Green / yellow / red per subsystem, with the reason and last success / failure.">
      <div className="ops-health-grid">
        {view.subsystems.map((s) => (
          <div key={s.id} className="ops-health-cell">
            <div className="ops-health-cell__title"><ToneDot tone={s.tone} />{s.label}</div>
            <div className="ops-health-cell__reason">{s.reason}</div>
            <div className="ops-health-cell__times">
              last success {ago(s.lastSuccessAt, now)} · last failure {ago(s.lastFailureAt, now)}
            </div>
          </div>
        ))}
      </div>
    </Av3Panel>
  );
}

export function JobsPanel({ view, now }: { view: OpsView; now: number }) {
  return (
    <Av3Panel
      title="Scheduled jobs"
      subtitle={
        (view.scheduler.pgCronInstalled
          ? "Supabase pg_cron scheduler is installed."
          : "pg_cron is NOT installed — these runs come from external schedulers (GitHub Actions, throttled). Apply migration 083.") +
        (view.scheduler.control.known
          ? ` Kill switch: ${view.scheduler.control.enabled ? "ON (dispatching)" : "OFF (paused)"} · pruning: ${view.scheduler.control.pruneEnabled ? "on" : "off"}${view.scheduler.control.lastPruneAt ? ` (last ${view.scheduler.control.lastPruneAt.slice(0, 16)}Z)` : ""}.`
          : " Kill-switch state unavailable (apply migration 089).")
      }
    >
      <div className="ops-table-scroll">
        <Av3DataTable
          rows={view.jobs}
          rowKey={(j) => j.id}
          columns={[
            { key: "j", header: "Job", render: (j) => j.label },
            { key: "st", header: "Status", render: (j) => <Av3StatusBadge label={j.tone} tone={j.tone} /> },
            { key: "e", header: "Every", numeric: true, render: (j) => `${j.everyMinutes}m` },
            { key: "l", header: "Last run", render: (j) => ago(j.lastRunAt, now) },
            { key: "r", header: "Runs 24h", numeric: true, render: (j) => fmt(j.runs24h) },
            { key: "f", header: "Failed 24h", numeric: true, render: (j) => fmt(j.failures24h) },
            { key: "d", header: "Last duration", numeric: true, render: (j) => (j.lastDurationMs === null ? "—" : `${Math.round(j.lastDurationMs / 1000)}s`) },
            { key: "m", header: "Note", render: (j) => j.message },
          ]}
        />
      </div>
    </Av3Panel>
  );
}

export function ProvidersPanel({ view, now }: { view: OpsView; now: number }) {
  const open = view.ai.circuit.filter((c) => c.disabled_until && new Date(c.disabled_until).getTime() > now);
  return (
    <Av3Panel title="AI provider health" subtitle={`${open.length} circuit(s) open. Failover order: primary → fallback → emergency; each attempt is logged with provider, model, latency and reason.`}>
      <div className="ops-table-scroll">
        <Av3DataTable
          rows={view.ai.usage_24h}
          rowKey={(u) => `${u.provider}-${u.model}-${u.operation}`}
          empty={<Av3EmptyState title="No AI calls in 24h" message="No editorial AI usage has been recorded." />}
          columns={[
            { key: "p", header: "Provider", render: (u) => u.provider },
            { key: "m", header: "Model", render: (u) => u.model },
            { key: "o", header: "Operation", render: (u) => u.operation },
            { key: "c", header: "Calls", numeric: true, render: (u) => fmt(u.calls) },
            { key: "ok", header: "OK", numeric: true, render: (u) => fmt(u.ok) },
            { key: "f", header: "Failed", numeric: true, render: (u) => fmt(u.failed) },
            { key: "lat", header: "Avg latency", numeric: true, render: (u) => (u.avg_latency_ms ? `${u.avg_latency_ms}ms` : "—") },
            { key: "e", header: "Last error", render: (u) => u.last_error ?? "—" },
          ]}
        />
      </div>
      {open.length ? (
        <p className="ops-kpi__hint" style={{ marginTop: "0.6rem" }}>
          Open circuits: {open.map((c) => `${c.key} (${c.failure_class ?? "failure"}, until ${c.disabled_until?.slice(11, 16)}Z)`).join(" · ")}
        </p>
      ) : null}
    </Av3Panel>
  );
}
