"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExecutiveDashboard } from "@/lib/observability/executive-dashboard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";

const POLL_MS = 90_000;
const CHART_TOOLTIP = {
  contentStyle: {
    background: "rgba(10,10,14,0.95)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    fontSize: 12,
  },
};

type Money = { usdLabel: string; inrLabel: string };

function DualMoney({ amount, hero }: { amount: Money; hero?: boolean }) {
  return (
    <>
      <span className={hero ? "ecfo__kpi-usd" : "ecfo__money-usd"}>{amount.usdLabel}</span>
      <span className={hero ? "ecfo__kpi-inr" : "ecfo__money-inr"}>{amount.inrLabel}</span>
    </>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="ecfo__section-head">
      <h3>{title}</h3>
      {subtitle ? <span>{subtitle}</span> : null}
    </div>
  );
}

function KpiHero({ label, amount }: { label: string; amount: Money }) {
  return (
    <motion.div
      className="ecfo__kpi ecfo__kpi--hero"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className="ecfo__kpi-label">{label}</span>
      <DualMoney amount={amount} hero />
    </motion.div>
  );
}

function KpiStat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="ecfo__kpi">
      <span className="ecfo__kpi-label">{label}</span>
      <span className="ecfo__kpi-value">
        {value}
        {suffix ? <span style={{ fontSize: "0.75rem", color: "var(--ecfo-muted)" }}> {suffix}</span> : null}
      </span>
    </div>
  );
}

export function ExecutiveCfoPanel() {
  const [data, setData] = useState<ExecutiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetIdx, setBudgetIdx] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<"daily" | "weekly" | "monthly" | "quarterly">("daily");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ops/executive", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to load executive dashboard");
        return;
      }
      setData(json.dashboard as ExecutiveDashboard);
      setError(null);
    } catch {
      setError("Network error loading executive dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const budgetScenario = useMemo(() => {
    if (!data) return null;
    const idx = Math.min(budgetIdx, data.budgetSimulator.scenarios.length - 1);
    return data.budgetSimulator.scenarios[idx] ?? data.budgetSimulator.scenarios[0];
  }, [data, budgetIdx]);

  async function handleExport(format: "csv" | "json" | "pdf") {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/ops/executive/export", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, period: reportPeriod }),
      });
      if (format === "json" || format === "pdf") {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `executive-cfo-${reportPeriod}.${format === "pdf" ? "json" : "json"}`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `executive-cfo-${reportPeriod}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="ecfo">
        <div className="anr-skeleton" style={{ height: "20rem" }} />
      </div>
    );
  }

  if (error && !data) {
    return <EmptyState title="Executive dashboard unavailable" hint={error} />;
  }

  if (!data) return null;

  const d = data;
  const budgetPct = d.budgetSimulator.selectedBudgetUsd > 0
    ? Math.min(100, (d.overview.monthlySpend.usd / d.budgetSimulator.selectedBudgetUsd) * 100)
    : 0;

  return (
    <div className="ecfo">
      {/* Header */}
      <header className="ecfo__header">
        <div className="ecfo__header-title">
          <h2>Executive AI CFO</h2>
          <span>Jandarpan AI News System · Command Center</span>
        </div>
        <div className="ecfo__header-actions">
          <span className="ecfo__live">Live</span>
          <span className="ecfo__rate-badge">1 USD = ₹{d.exchangeRate}</span>
          <span className="anr-meta">
            Updated <ClientTime iso={d.generatedAt} />
          </span>
          <button type="button" className="anr-btn anr-btn--ghost" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </header>

      {/* Section 1: Executive Overview */}
      <section className="ecfo__section">
        <SectionHead title="Executive Overview" subtitle="Real-time AI spend & savings" />
        <div className="ecfo__kpi-grid ecfo__kpi-grid--hero">
          <KpiHero label="Today's AI Spend" amount={d.overview.todaySpend} />
          <KpiHero label="Monthly Spend" amount={d.overview.monthlySpend} />
          <KpiHero label="Budget Remaining" amount={d.overview.budgetRemaining} />
          <KpiHero label="Money Saved" amount={d.overview.moneySaved} />
        </div>
      </section>

      {/* Section 2: Profitability */}
      <section className="ecfo__section">
        <SectionHead title="Profitability" subtitle="Cost economics & unit metrics" />
        <div className="ecfo__kpi-grid">
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Today&apos;s AI Cost</span>
            <DualMoney amount={d.profitability.todayAiCost} />
          </div>
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Today&apos;s Revenue</span>
            {d.profitability.todayRevenue ? (
              <DualMoney amount={d.profitability.todayRevenue} />
            ) : (
              <span className="ecfo__placeholder">Revenue tracking not configured</span>
            )}
          </div>
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Today&apos;s Profit</span>
            {d.profitability.todayProfit ? (
              <DualMoney amount={d.profitability.todayProfit} />
            ) : (
              <span className="ecfo__placeholder">—</span>
            )}
          </div>
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Monthly Profit</span>
            {d.profitability.monthlyProfit ? (
              <DualMoney amount={d.profitability.monthlyProfit} />
            ) : (
              <span className="ecfo__placeholder">—</span>
            )}
          </div>
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Yearly Projection</span>
            <DualMoney amount={d.profitability.yearlyProjection} />
          </div>
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Break-even Cost</span>
            <DualMoney amount={d.profitability.breakEvenCost} />
          </div>
          <KpiStat label="ROI" value={d.profitability.roi != null ? `${d.profitability.roi}%` : "—"} />
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Cost / Published Article</span>
            <DualMoney amount={d.profitability.costPerPublishedArticle} />
          </div>
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Cost / Visitor</span>
            {d.profitability.costPerVisitor ? (
              <DualMoney amount={d.profitability.costPerVisitor} />
            ) : (
              <span className="ecfo__placeholder">—</span>
            )}
          </div>
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Cost / Session</span>
            {d.profitability.costPerSession ? (
              <DualMoney amount={d.profitability.costPerSession} />
            ) : (
              <span className="ecfo__placeholder">—</span>
            )}
          </div>
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Cost / 100 Articles</span>
            <DualMoney amount={d.profitability.costPer100Articles} />
          </div>
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Cost / 1000 Articles</span>
            <DualMoney amount={d.profitability.costPer1000Articles} />
          </div>
        </div>
      </section>

      {/* Section 3: AI Business KPIs */}
      <section className="ecfo__section">
        <SectionHead title="AI Business KPIs" subtitle="Production throughput & quality" />
        <div className="ecfo__kpi-grid">
          <KpiStat label="Published Today" value={d.businessKpis.publishedToday} />
          <KpiStat label="Generated Today" value={d.businessKpis.generatedToday} />
          <KpiStat label="Translated Today" value={d.businessKpis.translatedToday} />
          <KpiStat label="Images Generated" value={d.businessKpis.imagesGeneratedToday} />
          <KpiStat label="Queue Size" value={d.businessKpis.queueSize} />
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Avg Cost / Article</span>
            <DualMoney amount={d.businessKpis.avgCostPerArticle} />
          </div>
          <KpiStat label="Avg Tokens / Article" value={d.businessKpis.avgTokensPerArticle.toLocaleString()} />
          <KpiStat label="Avg Latency" value={`${d.businessKpis.avgLatencyMs}ms`} />
          <KpiStat
            label="Avg Quality Score"
            value={d.businessKpis.avgQualityScore ?? "—"}
          />
          <KpiStat label="Cache Hit Rate" value={`${d.businessKpis.avgCacheHitRate}%`} />
        </div>
      </section>

      {/* Section 4: Budget Simulator */}
      <section className="ecfo__section">
        <SectionHead title="Budget Simulator" subtitle="Interactive monthly AI budget scenarios" />
        <div className="ecfo__card">
          <div className="ecfo__slider-wrap">
            <input
              type="range"
              className="ecfo__slider"
              min={0}
              max={d.budgetSimulator.presets.length - 1}
              value={budgetIdx}
              onChange={(e) => setBudgetIdx(Number(e.target.value))}
            />
            <div className="ecfo__slider-labels">
              {d.budgetSimulator.presets.map((p) => (
                <span key={p}>${p}</span>
              ))}
            </div>
          </div>
          {budgetScenario ? (
            <div className="ecfo__kpi-grid">
              <div className="ecfo__kpi">
                <span className="ecfo__kpi-label">Monthly Budget</span>
                <DualMoney amount={budgetScenario.budget} />
              </div>
              <KpiStat label="Articles Possible" value={budgetScenario.articlesPossible.toLocaleString()} />
              <KpiStat
                label="Queue Growth"
                value={budgetScenario.queueGrowthDays != null ? `${budgetScenario.queueGrowthDays} days` : "—"}
              />
              <div className="ecfo__kpi">
                <span className="ecfo__kpi-label">Monthly Burn</span>
                <DualMoney amount={budgetScenario.monthlyBurn} />
              </div>
              <div className="ecfo__kpi">
                <span className="ecfo__kpi-label">Yearly Burn</span>
                <DualMoney amount={budgetScenario.yearlyBurn} />
              </div>
            </div>
          ) : null}
          <div className="ecfo__budget-bar">
            <div className="ecfo__budget-fill" style={{ width: `${budgetPct}%` }} />
          </div>
          <p className="anr-meta">{budgetPct.toFixed(1)}% of ${d.budgetSimulator.selectedBudgetUsd} budget used</p>
        </div>
      </section>

      {/* Section 5: Queue Economics */}
      <section className="ecfo__section">
        <SectionHead title="Queue Economics" subtitle="Cost to clear backlog" />
        <div className="ecfo__kpi-grid">
          <KpiStat label="Current Queue" value={d.queueEconomics.currentQueue} />
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Est. Cost to Clear</span>
            <DualMoney amount={d.queueEconomics.estimatedClearCost} />
          </div>
          <KpiStat label="Est. Runtime" value={d.queueEconomics.estimatedRuntime} />
          <KpiStat label="Est. API Calls" value={d.queueEconomics.estimatedApiCalls.toLocaleString()} />
          <KpiStat label="Est. Token Consumption" value={d.queueEconomics.estimatedTokens.toLocaleString()} />
        </div>
      </section>

      {/* Section 6: Growth Forecast */}
      <section className="ecfo__section">
        <SectionHead title="Growth Forecast" subtitle="Scaling scenarios" />
        <div className="ecfo__card">
          <table className="ecfo__table">
            <thead>
              <tr>
                <th>Articles / Day</th>
                <th>Monthly AI Bill</th>
                <th>Yearly AI Bill</th>
                <th>Infrastructure Est.</th>
              </tr>
            </thead>
            <tbody>
              {d.growthForecast.map((g) => (
                <tr key={g.articlesPerDay}>
                  <td>{g.articlesPerDay.toLocaleString()}</td>
                  <td>
                    <DualMoney amount={g.monthlyBill} />
                  </td>
                  <td>
                    <DualMoney amount={g.yearlyBill} />
                  </td>
                  <td>
                    <DualMoney amount={g.infrastructureEstimate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 7: Worker Financials */}
      <section className="ecfo__section">
        <SectionHead title="Worker Financials" subtitle="Leaderboard by spend" />
        <div className="ecfo__card">
          <table className="ecfo__table">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Cost</th>
                <th>Tokens</th>
                <th>Latency</th>
                <th>Retries</th>
                <th>Cache Hits</th>
                <th>Savings</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {d.workerFinancials.map((w) => (
                <tr key={w.worker}>
                  <td>{w.label}</td>
                  <td><DualMoney amount={w.cost} /></td>
                  <td>{w.tokens.toLocaleString()}</td>
                  <td>{w.avgLatencyMs}ms</td>
                  <td>{w.retries}</td>
                  <td>{w.cacheHits}</td>
                  <td><DualMoney amount={w.savings} /></td>
                  <td>{w.roi}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 8: Language Analytics */}
      <section className="ecfo__section">
        <SectionHead title="Language Analytics" subtitle="Cost per language" />
        <div className="ecfo__split">
          {d.languageAnalytics.map((l) => (
            <div key={l.language} className="ecfo__card">
              <h4>{l.label}</h4>
              <p className="anr-meta">Articles: {l.articles} · Tokens: {l.tokens.toLocaleString()}</p>
              <DualMoney amount={l.spend} />
              <p className="anr-meta">Saved: {l.savings.usdLabel} ({l.savings.inrLabel})</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 9: District Analytics */}
      <section className="ecfo__section">
        <SectionHead title="District Analytics" subtitle="Top districts by spend" />
        <div className="ecfo__card">
          <table className="ecfo__table">
            <thead>
              <tr>
                <th>District</th>
                <th>Spend</th>
                <th>Articles</th>
                <th>Avg Quality</th>
              </tr>
            </thead>
            <tbody>
              {d.districtAnalytics.length === 0 ? (
                <tr><td colSpan={4} className="ecfo__placeholder">No district data yet</td></tr>
              ) : (
                d.districtAnalytics.map((row) => (
                  <tr key={row.district}>
                    <td>{row.district}</td>
                    <td><DualMoney amount={row.spend} /></td>
                    <td>{row.articles}</td>
                    <td>{row.avgQuality ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 10: Model Analytics */}
      <section className="ecfo__section">
        <SectionHead title="OpenAI Model Analytics" subtitle="Per-model performance" />
        <div className="ecfo__card">
          <table className="ecfo__table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Spend</th>
                <th>Tokens</th>
                <th>Latency</th>
                <th>Success</th>
                <th>Cache %</th>
              </tr>
            </thead>
            <tbody>
              {d.modelAnalytics.map((m) => (
                <tr key={m.model}>
                  <td>{m.model}</td>
                  <td><DualMoney amount={m.spend} /></td>
                  <td>{m.tokens.toLocaleString()}</td>
                  <td>{m.avgLatencyMs}ms</td>
                  <td>{m.successRate}%</td>
                  <td>{m.cachePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 11: Efficiency Score */}
      <section className="ecfo__section">
        <SectionHead title="Efficiency Score" subtitle="Overall AI efficiency 0–100" />
        <div className="ecfo__card">
          <div className="ecfo__score-ring">
            <div className="ecfo__score-main" style={{ ["--score" as string]: d.efficiencyScore.overall }}>
              <strong>{d.efficiencyScore.overall}</strong>
              <span>Overall</span>
            </div>
            <div className="ecfo__score-bars">
              {Object.entries(d.efficiencyScore.breakdown).map(([key, val]) => (
                <div key={key} className="ecfo__score-bar">
                  <span>{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</span>
                  <div className="ecfo__score-bar-track">
                    <div className="ecfo__score-bar-fill" style={{ width: `${val}%` }} />
                  </div>
                  <span>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 12: Savings Dashboard */}
      <section className="ecfo__section">
        <SectionHead title="Savings Dashboard" subtitle="Optimization impact" />
        <div className="ecfo__kpi-grid">
          <div className="ecfo__kpi"><span className="ecfo__kpi-label">Saved Today</span><DualMoney amount={d.savings.today} /></div>
          <div className="ecfo__kpi"><span className="ecfo__kpi-label">Saved This Month</span><DualMoney amount={d.savings.thisMonth} /></div>
          <div className="ecfo__kpi"><span className="ecfo__kpi-label">By Cache</span><DualMoney amount={d.savings.byCache} /></div>
          <div className="ecfo__kpi"><span className="ecfo__kpi-label">By Retries</span><DualMoney amount={d.savings.byRetries} /></div>
          <div className="ecfo__kpi"><span className="ecfo__kpi-label">By Optimization</span><DualMoney amount={d.savings.byOptimization} /></div>
          <div className="ecfo__kpi"><span className="ecfo__kpi-label">By Prompt Trimming</span><DualMoney amount={d.savings.byPromptTrimming} /></div>
        </div>
      </section>

      {/* Section 13: AI Recommendations */}
      <section className="ecfo__section">
        <SectionHead title="AI Recommendations" subtitle="Top optimization opportunities" />
        <div className="ecfo__rec-list">
          {d.recommendations.map((r) => (
            <div key={r.id} className="ecfo__rec">
              <div className="ecfo__rec-head">
                <div>
                  <span className={`ecfo__badge ecfo__badge--${r.priority}`}>{r.priority}</span>
                  <div className="ecfo__rec-title">{r.title}</div>
                </div>
                <div className="ecfo__rec-savings">
                  <strong>{r.potentialSavings.usdLabel}</strong>
                  <span>{r.potentialSavings.inrLabel}</span>
                </div>
              </div>
              <p className="ecfo__rec-desc">{r.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 14: Anomaly Detection */}
      <section className="ecfo__section">
        <SectionHead title="Anomaly Detection" subtitle="Real-time alerts timeline" />
        {d.anomalies.length === 0 ? (
          <p className="ecfo__placeholder">No anomalies detected — all systems normal.</p>
        ) : (
          d.anomalies.map((a) => (
            <div key={a.id} className={`ecfo__anomaly${a.severity === "critical" ? " ecfo__anomaly--critical" : ""}`}>
              <time>{new Date(a.timestamp).toLocaleString()}</time>
              <div>
                <strong>{a.type.replace(/_/g, " ")}</strong> — {a.message}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Section 15: Reports */}
      <section className="ecfo__section">
        <SectionHead title="Reports" subtitle="Generate & export executive reports" />
        <div className="ecfo__card">
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            {d.reports.available.map((p) => (
              <button
                key={p}
                type="button"
                className={`anr-btn anr-btn--ghost${reportPeriod === p ? " is-active" : ""}`}
                onClick={() => setReportPeriod(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="ecfo__export-bar">
            {d.reports.exportFormats.map((f) => (
              <button
                key={f}
                type="button"
                className="anr-btn anr-btn--primary"
                disabled={exporting}
                onClick={() => void handleExport(f)}
              >
                Export {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 16: Alerts */}
      <section className="ecfo__section">
        <SectionHead title="Alerts" subtitle="Budget · Queue · Cost · Worker · OpenAI" />
        <div className="ecfo__alert-grid">
          {d.alerts.budget.map((b) => (
            <div key={b.threshold} className={`ecfo__alert${b.triggered ? " ecfo__alert--on" : " ecfo__alert--off"}`}>
              <strong>Budget {b.threshold}%</strong>
              <p>{b.message}</p>
            </div>
          ))}
          <div className={`ecfo__alert${d.alerts.queue.triggered ? " ecfo__alert--on" : " ecfo__alert--off"}`}>
            <strong>Queue</strong><p>{d.alerts.queue.message}</p>
          </div>
          <div className={`ecfo__alert${d.alerts.cost.triggered ? " ecfo__alert--on" : " ecfo__alert--off"}`}>
            <strong>Cost</strong><p>{d.alerts.cost.message}</p>
          </div>
          <div className={`ecfo__alert${d.alerts.worker.triggered ? " ecfo__alert--on" : " ecfo__alert--off"}`}>
            <strong>Worker</strong><p>{d.alerts.worker.message}</p>
          </div>
          <div className={`ecfo__alert${d.alerts.openai.triggered ? " ecfo__alert--on" : " ecfo__alert--off"}`}>
            <strong>OpenAI</strong><p>{d.alerts.openai.message}</p>
          </div>
        </div>
      </section>

      {/* Section 17: Visualizations */}
      <section className="ecfo__section">
        <SectionHead title="Visualizations" subtitle="14-day trends" />
        <div className="ecfo__charts-grid">
          <div className="ecfo__card">
            <h4>Cost Trend (USD)</h4>
            <div className="ecfo__chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.trends.cost}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Area type="monotone" dataKey="usd" stroke="#6366f1" fill="rgba(99,102,241,0.15)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="ecfo__card">
            <h4>Token Trend</h4>
            <div className="ecfo__chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.trends.tokens}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Line type="monotone" dataKey="input" stroke="#6366f1" dot={false} />
                  <Line type="monotone" dataKey="output" stroke="#8b5cf6" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="ecfo__card">
            <h4>Savings Trend</h4>
            <div className="ecfo__chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.trends.savings}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="usd" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="ecfo__card">
            <h4>Forecast Trend</h4>
            <div className="ecfo__chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.trends.forecast}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Line type="monotone" dataKey="projectedUsd" stroke="#f59e0b" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="ecfo__card">
            <h4>Queue Trend</h4>
            <div className="ecfo__chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.trends.queue}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Area type="monotone" dataKey="pending" stroke="#ef4444" fill="rgba(239,68,68,0.12)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="ecfo__card">
            <h4>ROI Trend</h4>
            <div className="ecfo__chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.trends.roi}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#71717a" />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Line type="monotone" dataKey="roi" stroke="#10b981" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Section 18: Exchange Rate */}
      <section className="ecfo__section">
        <SectionHead title="Exchange Rate" subtitle="All values shown in USD + INR" />
        <div className="ecfo__card">
          <p className="anr-meta">
            Current rate: <strong>1 USD = ₹{d.exchangeRate}</strong>
          </p>
          <p className="anr-meta">
            Configured via <code>OPENAI_COST_EXCHANGE_RATE</code> environment variable. Default: 86.
            Future support for live exchange rate API integration.
          </p>
          <div className="ecfo__kpi-grid" style={{ marginTop: "0.75rem" }}>
            <div className="ecfo__kpi">
              <span className="ecfo__kpi-label">Example: $1.00</span>
              <span className="ecfo__kpi-inr">₹{(d.exchangeRate).toFixed(2)}</span>
            </div>
            <div className="ecfo__kpi">
              <span className="ecfo__kpi-label">Example: $50.00</span>
              <span className="ecfo__kpi-inr">₹{(50 * d.exchangeRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="ecfo__kpi">
              <span className="ecfo__kpi-label">Example: $500.00</span>
              <span className="ecfo__kpi-inr">₹{(500 * d.exchangeRate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
