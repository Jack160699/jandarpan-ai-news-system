"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/components/admin-newsroom/ui/AdminCard";

type HealthPayload = {
  ok: boolean;
  status: string;
  stability: {
    score: number;
    grade: string;
    factors: Array<{ name: string; weight: number; score: number; note?: string }>;
  };
  checks: Array<{
    id: string;
    label: string;
    status: string;
    latencyMs: number;
    message?: string;
  }>;
  metrics: {
    memoryUsageMb: number;
    uptimeSec: number;
    api: Array<{ route: string; durationMs: number; status: number }>;
    workers: Array<{ worker: string; ok: boolean; durationMs: number }>;
    queues: { aiPending: number; editorialImagesPending: number } | null;
  };
  cron: { jobs: Array<{ job: string; ok: boolean; startedAt: string }>; staleJobs: string[] };
  errors: { total: number; last24h: number; bySeverity: Record<string, number> };
  recentErrors: Array<{
    id: string;
    ts: string;
    severity: string;
    source: string;
    message: string;
  }>;
  caching: { redis: boolean };
  observability: { sentry: boolean };
  queueAnalytics?: {
    ai: {
      pending: number;
      dead: number;
      drainPerHour: number;
      eta: { etaLabel: string };
    };
    editorial: {
      pending: number;
      processing: number;
      drainPerHour: number;
      eta: { etaLabel: string };
      avgGenerationMs: number | null;
      openAiSuccessRate: number;
      storageSuccessRate: number;
      retries: number;
      deadJobs: number;
      failureReasons: Record<string, number>;
    };
    performance: {
      aiRecordsPerSec: number;
      editorialRecordsPerSec: number;
      bottleneck: string;
    };
    recentFailures: {
      ai: Array<{
        articleId: string;
        error: string;
        provider?: string;
        httpStatus?: number;
        retryCount: number;
        terminal: boolean;
        category: string;
      }>;
      editorial: Array<{
        articleId: string;
        error: string;
        provider?: string;
        httpStatus?: number;
        retryCount: number;
        terminal: boolean;
        category: string;
      }>;
    };
  };
  openAiUsage?: {
    todaySpendUsd: number;
    yesterdaySpendUsd: number;
    last7DaysSpendUsd: number;
    last30DaysSpendUsd: number;
    costByWorker: Array<{ worker: string; costUsd: number; requests: number }>;
    costByModel: Array<{ model: string; costUsd: number; requests: number }>;
    costByArticle: Array<{ articleId: string; costUsd: number; requests: number }>;
    avgTokensPerRequest: { input: number; output: number };
    largestPromptToday: {
      operation: string;
      inputTokens: number;
      promptChars: number | null;
      articleId: string | null;
      createdAt: string;
    } | null;
    largestCompletionToday: {
      operation: string;
      outputTokens: number;
      completionChars: number | null;
      articleId: string | null;
      createdAt: string;
    } | null;
    mostExpensiveArticle: { articleId: string; costUsd: number; requests: number } | null;
    mostExpensiveWorker: { worker: string; costUsd: number; requests: number } | null;
    retryCostUsd: number;
    duplicateWorkDetected: Array<{
      promptHash: string;
      count: number;
      totalCostUsd: number;
      operations: string[];
    }>;
    topExpensiveRequests: Array<{
      id: string;
      operation: string;
      worker: string | null;
      model: string;
      articleId: string | null;
      inputTokens: number;
      outputTokens: number;
      estimatedCostUsd: number;
      createdAt: string;
      retryCount: number;
    }>;
    optimizationOpportunities: Array<{
      id: string;
      category: string;
      description: string;
      estimatedMonthlySavingsUsd: number;
    }>;
    totalRequests: number;
    instrumentedSince: string | null;
  };
  aiFinancial?: {
    exchangeRate: number;
    spend: {
      today: { usdLabel: string; inrLabel: string };
      yesterday: { usdLabel: string; inrLabel: string };
      last7Days: { usdLabel: string; inrLabel: string };
      last30Days: { usdLabel: string; inrLabel: string };
      currentMonth: { usdLabel: string; inrLabel: string };
      projectedMonthly: { usdLabel: string; inrLabel: string };
      projectedYearly: { usdLabel: string; inrLabel: string };
    };
    costByWorker: Array<{
      label: string;
      cost: { usdLabel: string; inrLabel: string };
      requests: number;
    }>;
    articlesToday: {
      count: number;
      avgCostPerArticle: { usdLabel: string; inrLabel: string };
      medianCostPerArticle: { usdLabel: string; inrLabel: string };
      highest: { title: string; cost: { usdLabel: string; inrLabel: string } } | null;
      lowest: { title: string; cost: { usdLabel: string; inrLabel: string } } | null;
    };
    topExpensiveArticles: Array<{
      title: string;
      worker: string;
      model: string;
      inputTokens: number;
      outputTokens: number;
      cost: { usdLabel: string; inrLabel: string };
    }>;
    cache: { hits: number; misses: number; saved: { usdLabel: string; inrLabel: string } };
    repair: { skipped: number; estimatedSaved: { usdLabel: string; inrLabel: string } };
    retries: { count: number; cost: { usdLabel: string; inrLabel: string } };
    duplicates: {
      prevented: number;
      estimatedSaved: { usdLabel: string; inrLabel: string };
    };
    budget: {
      monthlyLimit: { usdLabel: string; inrLabel: string };
      currentSpend: { usdLabel: string; inrLabel: string };
      percentUsed: number;
      forecast: { usdLabel: string; inrLabel: string };
      daysRemaining: number;
      burnRatePerDay: { usdLabel: string; inrLabel: string };
      warnings: string[];
    };
    forecast: {
      burnPerDay: { usdLabel: string; inrLabel: string };
      projectedMonth: { usdLabel: string; inrLabel: string };
      projectedYear: { usdLabel: string; inrLabel: string };
      backlogAiQueueCost: { usdLabel: string; inrLabel: string };
      backlogEditorialImagesCost: { usdLabel: string; inrLabel: string };
    };
    optimizationReport: {
      topCostDrivers: Array<{ name: string; cost: { usdLabel: string; inrLabel: string }; sharePct: number }>;
      topRetryCosts: { usdLabel: string; inrLabel: string };
      topDuplicateCosts: { usdLabel: string; inrLabel: string };
    };
    tokens: {
      avgInputPerRequest: number;
      avgOutputPerRequest: number;
      avgInputPerArticle: number;
      avgOutputPerArticle: number;
    };
    successMetrics: {
      targetCostReductionPct: string;
      targetInputTokenReductionPct: string;
      targetOutputTokenReductionPct: string;
      targetDuplicateReductionPct: string;
    };
    totalRequests: number;
  };
};

const STATUS_CLASS: Record<string, string> = {
  healthy: "anr-pulse-item--stable",
  degraded: "anr-pulse-item--warning",
  unhealthy: "anr-pulse-item--breaking",
  unknown: "",
};

function DualMoney({ amount }: { amount: { usdLabel: string; inrLabel: string } }) {
  return (
    <>
      <p className="anr-health-ops__score">{amount.usdLabel}</p>
      <p className="anr-meta">({amount.inrLabel})</p>
    </>
  );
}

export function HealthOperationsPanel() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ops/health", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load health data");
        setData(json);
        return;
      }
      setData(json);
    } catch {
      setError("Network error loading health dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading && !data) {
    return <p className="anr-meta">Loading platform health…</p>;
  }

  if (error && !data) {
    return (
      <div>
        <p className="anr-meta anr-meta--warn">{error}</p>
        <button type="button" className="anr-btn anr-btn--ghost" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="anr-health-ops">
      <div className="anr-health-ops__toolbar">
        <p className="anr-meta">
          Status: <strong>{data.status}</strong> · Grade{" "}
          <strong>{data.stability.grade}</strong> ({data.stability.score}/100)
        </p>
        <button type="button" className="anr-btn anr-btn--ghost" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div className="anr-ingestion__grid">
        <AdminCard title="Stability score" description="Production readiness">
          <p className="anr-health-ops__score">{data.stability.score}</p>
          <p className="anr-meta">Grade {data.stability.grade}</p>
        </AdminCard>
        <AdminCard title="Errors (24h)" description="Tracked ops events">
          <p className="anr-health-ops__score">{data.errors.last24h}</p>
          <p className="anr-meta">Critical: {data.errors.bySeverity.critical ?? 0}</p>
        </AdminCard>
        <AdminCard title="Memory" description="Node heap">
          <p className="anr-health-ops__score">{data.metrics.memoryUsageMb} MB</p>
          <p className="anr-meta">Uptime {Math.round(data.metrics.uptimeSec / 60)}m</p>
        </AdminCard>
        <AdminCard title="Cache layer" description="Upstash Redis">
          <p className="anr-health-ops__score">{data.caching.redis ? "ON" : "OFF"}</p>
          <p className="anr-meta">Sentry {data.observability.sentry ? "ON" : "OFF"}</p>
        </AdminCard>
      </div>

      <AdminCard title="Health checks" description="Supabase, OpenAI, cron, vectors, queues, ingestion">
        <ul className="anr-health-ops__checks">
          {data.checks.map((check) => (
            <li
              key={check.id}
              className={`anr-pulse-item ${STATUS_CLASS[check.status] ?? ""}`}
            >
              <span>{check.label}</span>
              <span>
                {check.status} · {check.latencyMs}ms
                {check.message ? ` — ${check.message}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </AdminCard>

      <div className="anr-ingestion__split">
        <AdminCard title="Cron jobs" description="Last orchestration runs">
          {data.cron.staleJobs.length > 0 ? (
            <p className="anr-meta anr-meta--warn">
              Stale: {data.cron.staleJobs.join(", ")}
            </p>
          ) : null}
          <ul>
            {data.cron.jobs.slice(0, 6).map((job) => (
              <li key={`${job.job}-${job.startedAt}`}>
                {job.job} · {job.ok ? "ok" : "failed"} ·{" "}
                {new Date(job.startedAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard title="Queue backlog" description="AI + editorial images">
          <p className="anr-meta">
            AI pending: {data.metrics.queues?.aiPending ?? data.queueAnalytics?.ai.pending ?? "—"}
          </p>
          <p className="anr-meta">
            Images pending:{" "}
            {data.metrics.queues?.editorialImagesPending ??
              data.queueAnalytics?.editorial.pending ??
              "—"}
          </p>
          {data.queueAnalytics ? (
            <>
              <p className="anr-meta">
                AI drain: {data.queueAnalytics.ai.drainPerHour}/hr · ETA{" "}
                {data.queueAnalytics.ai.eta.etaLabel}
              </p>
              <p className="anr-meta">
                Editorial drain: {data.queueAnalytics.editorial.drainPerHour}/hr · ETA{" "}
                {data.queueAnalytics.editorial.eta.etaLabel}
              </p>
            </>
          ) : null}
        </AdminCard>
      </div>

      {data.queueAnalytics ? (
        <div className="anr-ingestion__split">
          <AdminCard title="Queue throughput" description="Drain rates and performance">
            <p className="anr-meta">
              AI: {data.queueAnalytics.ai.drainPerHour}/hr ·{" "}
              {data.queueAnalytics.performance.aiRecordsPerSec} rec/s
            </p>
            <p className="anr-meta">
              Editorial: {data.queueAnalytics.editorial.drainPerHour}/hr ·{" "}
              {data.queueAnalytics.performance.editorialRecordsPerSec} rec/s
            </p>
            <p className="anr-meta">
              Bottleneck: {data.queueAnalytics.performance.bottleneck}
            </p>
            <p className="anr-meta">
              AI dead jobs: {data.queueAnalytics.ai.dead}
            </p>
          </AdminCard>

          <AdminCard title="Image pipeline" description="OpenAI, storage, retries">
            <p className="anr-meta">
              OpenAI success: {data.queueAnalytics.editorial.openAiSuccessRate}%
            </p>
            <p className="anr-meta">
              Storage success: {data.queueAnalytics.editorial.storageSuccessRate}%
            </p>
            <p className="anr-meta">
              Avg generation:{" "}
              {data.queueAnalytics.editorial.avgGenerationMs != null
                ? `${Math.round(data.queueAnalytics.editorial.avgGenerationMs / 1000)}s`
                : "—"}
            </p>
            <p className="anr-meta">
              Retries: {data.queueAnalytics.editorial.retries} · Dead:{" "}
              {data.queueAnalytics.editorial.deadJobs}
            </p>
            {Object.keys(data.queueAnalytics.editorial.failureReasons).length > 0 ? (
              <ul>
                {Object.entries(data.queueAnalytics.editorial.failureReasons).map(
                  ([reason, count]) => (
                    <li key={reason} className="anr-meta">
                      {reason}: {count}
                    </li>
                  )
                )}
              </ul>
            ) : null}
          </AdminCard>
        </div>
      ) : null}

      {data.queueAnalytics &&
      (data.queueAnalytics.recentFailures.ai.length > 0 ||
        data.queueAnalytics.recentFailures.editorial.length > 0) ? (
        <AdminCard title="Recent queue failures" description="Structured failure records">
          <ul className="anr-health-ops__errors">
            {[
              ...data.queueAnalytics.recentFailures.editorial,
              ...data.queueAnalytics.recentFailures.ai,
            ]
              .slice(0, 10)
              .map((f) => (
                <li key={`${f.articleId}-${f.error}`}>
                  <span className={`anr-tag anr-tag--${f.terminal ? "critical" : "medium"}`}>
                    {f.terminal ? "dead" : "retry"}
                  </span>
                  <strong>{f.articleId.slice(0, 8)}…</strong> — {f.error}
                  <br />
                  <span className="anr-meta">
                    {f.category}
                    {f.provider ? ` · ${f.provider}` : ""}
                    {f.httpStatus ? ` · HTTP ${f.httpStatus}` : ""}
                    {` · attempt ${f.retryCount}`}
                  </span>
                </li>
              ))}
          </ul>
        </AdminCard>
      ) : null}

      {data.aiFinancial ? (
        <>
          <AdminCard
            title="AI Financial Dashboard"
            description={`USD + INR · Rate 1 USD = ₹${data.aiFinancial.exchangeRate}`}
          >
            <div className="anr-ingestion__grid">
              <div>
                <p className="anr-meta">OpenAI Spend Today</p>
                <DualMoney amount={data.aiFinancial.spend.today} />
              </div>
              <div>
                <p className="anr-meta">Yesterday</p>
                <DualMoney amount={data.aiFinancial.spend.yesterday} />
              </div>
              <div>
                <p className="anr-meta">Last 7 Days</p>
                <DualMoney amount={data.aiFinancial.spend.last7Days} />
              </div>
              <div>
                <p className="anr-meta">Last 30 Days</p>
                <DualMoney amount={data.aiFinancial.spend.last30Days} />
              </div>
            </div>
            <p className="anr-meta">
              Current month: {data.aiFinancial.spend.currentMonth.usdLabel} (
              {data.aiFinancial.spend.currentMonth.inrLabel}) · Projected month:{" "}
              {data.aiFinancial.spend.projectedMonthly.usdLabel} (
              {data.aiFinancial.spend.projectedMonthly.inrLabel}) · Projected year:{" "}
              {data.aiFinancial.spend.projectedYearly.usdLabel} (
              {data.aiFinancial.spend.projectedYearly.inrLabel})
            </p>
          </AdminCard>

          <div className="anr-ingestion__split">
            <AdminCard title="Cost by Worker" description="Last 30 days">
              <ul>
                {data.aiFinancial.costByWorker.map((w) => (
                  <li key={w.label} className="anr-meta">
                    <strong>{w.label}</strong>: {w.cost.usdLabel} ({w.cost.inrLabel}) ·{" "}
                    {w.requests} req
                  </li>
                ))}
              </ul>
            </AdminCard>
            <AdminCard title="Budget Monitor" description="Monthly OpenAI budget">
              <p className="anr-meta">
                Limit: {data.aiFinancial.budget.monthlyLimit.usdLabel} (
                {data.aiFinancial.budget.monthlyLimit.inrLabel})
              </p>
              <p className="anr-meta">
                Spent: {data.aiFinancial.budget.currentSpend.usdLabel} (
                {data.aiFinancial.budget.currentSpend.inrLabel}) —{" "}
                {data.aiFinancial.budget.percentUsed}% used
              </p>
              <p className="anr-meta">
                Burn/day: {data.aiFinancial.budget.burnRatePerDay.usdLabel} (
                {data.aiFinancial.budget.burnRatePerDay.inrLabel}) · {data.aiFinancial.budget.daysRemaining} days left
              </p>
              {data.aiFinancial.budget.warnings.length > 0 ? (
                <p className="anr-meta anr-meta--warn">
                  Warnings: {data.aiFinancial.budget.warnings.join("%, ")}%
                </p>
              ) : null}
              <div
                style={{
                  height: 8,
                  background: "#e5e7eb",
                  borderRadius: 4,
                  marginTop: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, data.aiFinancial.budget.percentUsed)}%`,
                    height: "100%",
                    background:
                      data.aiFinancial.budget.percentUsed >= 90
                        ? "#dc2626"
                        : data.aiFinancial.budget.percentUsed >= 75
                          ? "#f59e0b"
                          : "#16a34a",
                  }}
                />
              </div>
            </AdminCard>
          </div>

          <AdminCard title="Cost per Article" description="Today's article economics">
            <p className="anr-meta">Articles tracked: {data.aiFinancial.articlesToday.count}</p>
            <p className="anr-meta">
              Avg/article: {data.aiFinancial.articlesToday.avgCostPerArticle.usdLabel} (
              {data.aiFinancial.articlesToday.avgCostPerArticle.inrLabel}) · Median:{" "}
              {data.aiFinancial.articlesToday.medianCostPerArticle.usdLabel} (
              {data.aiFinancial.articlesToday.medianCostPerArticle.inrLabel})
            </p>
            {data.aiFinancial.articlesToday.highest ? (
              <p className="anr-meta">
                Highest: {data.aiFinancial.articlesToday.highest.title} —{" "}
                {data.aiFinancial.articlesToday.highest.cost.usdLabel} (
                {data.aiFinancial.articlesToday.highest.cost.inrLabel})
              </p>
            ) : null}
            {data.aiFinancial.articlesToday.lowest ? (
              <p className="anr-meta">
                Lowest: {data.aiFinancial.articlesToday.lowest.title} —{" "}
                {data.aiFinancial.articlesToday.lowest.cost.usdLabel} (
                {data.aiFinancial.articlesToday.lowest.cost.inrLabel})
              </p>
            ) : null}
          </AdminCard>

          {data.aiFinancial.topExpensiveArticles.length > 0 ? (
            <AdminCard title="Top 20 Expensive Articles" description="USD + INR">
              <ul className="anr-health-ops__errors">
                {data.aiFinancial.topExpensiveArticles.map((a) => (
                  <li key={a.title}>
                    <strong>{a.title}</strong> · {a.worker} · {a.model}
                    <br />
                    <span className="anr-meta">
                      {a.inputTokens} in / {a.outputTokens} out · {a.cost.usdLabel} ({a.cost.inrLabel})
                    </span>
                  </li>
                ))}
              </ul>
            </AdminCard>
          ) : null}

          <div className="anr-ingestion__split">
            <AdminCard title="Optimization Savings" description="Cache, repair, retries, duplicates">
              <p className="anr-meta">
                Cache hits: {data.aiFinancial.cache.hits} · misses: {data.aiFinancial.cache.misses}
              </p>
              <p className="anr-meta">
                Cache saved: {data.aiFinancial.cache.saved.usdLabel} ({data.aiFinancial.cache.saved.inrLabel})
              </p>
              <p className="anr-meta">
                Repairs skipped: {data.aiFinancial.repair.skipped} · saved{" "}
                {data.aiFinancial.repair.estimatedSaved.usdLabel} (
                {data.aiFinancial.repair.estimatedSaved.inrLabel})
              </p>
              <p className="anr-meta">
                Retry cost: {data.aiFinancial.retries.cost.usdLabel} ({data.aiFinancial.retries.cost.inrLabel}) ·{" "}
                {data.aiFinancial.retries.count} retries
              </p>
              <p className="anr-meta">
                Duplicates prevented: {data.aiFinancial.duplicates.prevented} · saved{" "}
                {data.aiFinancial.duplicates.estimatedSaved.usdLabel} (
                {data.aiFinancial.duplicates.estimatedSaved.inrLabel})
              </p>
            </AdminCard>
            <AdminCard title="Cost Forecast" description="Burn rate and backlog">
              <p className="anr-meta">
                Burn/day: {data.aiFinancial.forecast.burnPerDay.usdLabel} (
                {data.aiFinancial.forecast.burnPerDay.inrLabel})
              </p>
              <p className="anr-meta">
                Projected month: {data.aiFinancial.forecast.projectedMonth.usdLabel} (
                {data.aiFinancial.forecast.projectedMonth.inrLabel})
              </p>
              <p className="anr-meta">
                Projected year: {data.aiFinancial.forecast.projectedYear.usdLabel} (
                {data.aiFinancial.forecast.projectedYear.inrLabel})
              </p>
              <p className="anr-meta">
                AI queue backlog est.: {data.aiFinancial.forecast.backlogAiQueueCost.usdLabel} (
                {data.aiFinancial.forecast.backlogAiQueueCost.inrLabel})
              </p>
              <p className="anr-meta">
                Image queue backlog est.: {data.aiFinancial.forecast.backlogEditorialImagesCost.usdLabel} (
                {data.aiFinancial.forecast.backlogEditorialImagesCost.inrLabel})
              </p>
            </AdminCard>
          </div>

          <AdminCard title="Optimization Report" description="Top cost drivers">
            <ul>
              {data.aiFinancial.optimizationReport.topCostDrivers.map((d) => (
                <li key={d.name} className="anr-meta">
                  {d.name}: {d.cost.usdLabel} ({d.cost.inrLabel}) — {d.sharePct}%
                </li>
              ))}
            </ul>
            <p className="anr-meta">
              Tokens/request: {data.aiFinancial.tokens.avgInputPerRequest} in /{" "}
              {data.aiFinancial.tokens.avgOutputPerRequest} out · Per article:{" "}
              {data.aiFinancial.tokens.avgInputPerArticle} in /{" "}
              {data.aiFinancial.tokens.avgOutputPerArticle} out
            </p>
            <p className="anr-meta">
              Targets: cost {data.aiFinancial.successMetrics.targetCostReductionPct} · input tokens{" "}
              {data.aiFinancial.successMetrics.targetInputTokenReductionPct} · output{" "}
              {data.aiFinancial.successMetrics.targetOutputTokenReductionPct} · duplicates{" "}
              {data.aiFinancial.successMetrics.targetDuplicateReductionPct}
            </p>
          </AdminCard>
        </>
      ) : null}

      <AdminCard title="Recent errors" description="Admin error tracking">
        <ul className="anr-health-ops__errors">
          {data.recentErrors.length === 0 ? (
            <li className="anr-meta">No recent errors</li>
          ) : (
            data.recentErrors.map((e) => (
              <li key={e.id}>
                <span className={`anr-tag anr-tag--${e.severity}`}>{e.severity}</span>
                <strong>{e.source}</strong> — {e.message}
                <br />
                <span className="anr-meta">{new Date(e.ts).toLocaleString()}</span>
              </li>
            ))
          )}
        </ul>
      </AdminCard>

      <AdminCard title="Stability factors" description="Weighted production score">
        <ul>
          {data.stability.factors.map((f) => (
            <li key={f.name}>
              {f.name}: {Math.round(f.score)} ({Math.round(f.weight * 100)}%)
              {f.note ? ` — ${f.note}` : ""}
            </li>
          ))}
        </ul>
      </AdminCard>

      <p className="anr-meta">
        Public probe: <code>/api/health</code> · Auto-refresh 60s
      </p>
    </div>
  );
}
