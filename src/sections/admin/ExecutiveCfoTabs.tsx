"use client";

import { memo } from "react";
import type { ExecutiveDashboard } from "@/lib/observability/executive-dashboard";
import {
  DualMoney,
  Expandable,
  ExecutiveAlertsList,
  ForecastCard,
  RecommendationCard,
  SectionHead,
} from "@/sections/admin/ExecutiveCfoUi";
import { buildDailyReport, queueHealthSummary, systemReliability } from "@/sections/admin/executive-cfo-helpers";

export const FinancialsTab = memo(function FinancialsTab({ d }: { d: ExecutiveDashboard }) {
  return (
    <div className="ecfo__tab-content">
      <ForecastCard d={d} />
      <SectionHead title="Profitability" subtitle="Revenue & unit economics" />
      <div className="ecfo__summary-row">
        <div className="ecfo__summary-card">
          <span>Today&apos;s AI cost</span>
          <DualMoney amount={d.profitability.todayAiCost} />
        </div>
        <div className="ecfo__summary-card">
          <span>Yearly projection</span>
          <DualMoney amount={d.profitability.yearlyProjection} />
        </div>
        <div className="ecfo__summary-card">
          <span>Break-even target</span>
          <DualMoney amount={d.profitability.breakEvenCost} />
        </div>
        <div className="ecfo__summary-card">
          <span>ROI</span>
          <strong className="ecfo__summary-value">
            {d.profitability.roi != null ? `${d.profitability.roi}%` : "—"}
          </strong>
        </div>
      </div>
      <Expandable title="Revenue & profit" summary={d.profitability.revenueAvailable ? "Data available" : "Not configured"}>
        <div className="ecfo__kpi-grid">
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
        </div>
      </Expandable>
      <Expandable title="Unit economics" summary="Per article, visitor & session">
        <div className="ecfo__kpi-grid">
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Cost / Published Article</span>
            <DualMoney amount={d.profitability.costPerPublishedArticle} />
          </div>
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Cost / 100 Articles</span>
            <DualMoney amount={d.profitability.costPer100Articles} />
          </div>
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Cost / 1000 Articles</span>
            <DualMoney amount={d.profitability.costPer1000Articles} />
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
        </div>
      </Expandable>
      <SectionHead title="Savings" subtitle="Optimization impact this month" />
      <div className="ecfo__summary-row">
        <div className="ecfo__summary-card ecfo__summary-card--success">
          <span>Saved today</span>
          <DualMoney amount={d.savings.today} />
        </div>
        <div className="ecfo__summary-card ecfo__summary-card--success">
          <span>Saved this month</span>
          <DualMoney amount={d.savings.thisMonth} />
        </div>
      </div>
      <Expandable title="Savings breakdown" summary="Cache, retries, optimization">
        <div className="ecfo__kpi-grid">
          <div className="ecfo__kpi"><span className="ecfo__kpi-label">By Cache</span><DualMoney amount={d.savings.byCache} /></div>
          <div className="ecfo__kpi"><span className="ecfo__kpi-label">By Retries</span><DualMoney amount={d.savings.byRetries} /></div>
          <div className="ecfo__kpi"><span className="ecfo__kpi-label">By Optimization</span><DualMoney amount={d.savings.byOptimization} /></div>
          <div className="ecfo__kpi"><span className="ecfo__kpi-label">By Prompt Trimming</span><DualMoney amount={d.savings.byPromptTrimming} /></div>
        </div>
      </Expandable>
    </div>
  );
});

export const OperationsTab = memo(function OperationsTab({ d }: { d: ExecutiveDashboard }) {
  const queue = queueHealthSummary(d);
  const reliability = systemReliability(d);

  return (
    <div className="ecfo__tab-content">
      <SectionHead title="Production" subtitle="Today's output" />
      <div className="ecfo__summary-row">
        <div className="ecfo__summary-card">
          <span>Published</span>
          <strong className="ecfo__summary-value">{d.businessKpis.publishedToday}</strong>
        </div>
        <div className="ecfo__summary-card">
          <span>Generated</span>
          <strong className="ecfo__summary-value">{d.businessKpis.generatedToday}</strong>
        </div>
        <div className="ecfo__summary-card">
          <span>Translated</span>
          <strong className="ecfo__summary-value">{d.businessKpis.translatedToday}</strong>
        </div>
        <div className="ecfo__summary-card">
          <span>Images</span>
          <strong className="ecfo__summary-value">{d.businessKpis.imagesGeneratedToday}</strong>
        </div>
      </div>

      <SectionHead title="Editorial editions" subtitle="Publish windows (IST)" />
      <div className="ecfo__summary-row">
        <div className="ecfo__summary-card">
          <span>Current edition</span>
          <strong className="ecfo__summary-value">See Overview</strong>
        </div>
        <div className="ecfo__summary-card">
          <span>Next edition</span>
          <strong className="ecfo__summary-value">See Overview</strong>
        </div>
        <div className="ecfo__summary-card">
          <span>Breaking queue</span>
          <strong className="ecfo__summary-value">—</strong>
          <small>Immediate override pipeline</small>
        </div>
        <div className="ecfo__summary-card">
          <span>Ready queue</span>
          <strong className="ecfo__summary-value">—</strong>
          <small>Scheduled-for-publish backlog</small>
        </div>
      </div>

      <SectionHead title="Queue Status" subtitle={`${queue.emoji} ${queue.label}`} />
      <div className="ecfo__summary-row">
        <div className="ecfo__summary-card">
          <span>Status</span>
          <strong>{queue.label}</strong>
          <small>{queue.completion}</small>
        </div>
        <div className="ecfo__summary-card">
          <span>Clear cost</span>
          <DualMoney amount={d.queueEconomics.estimatedClearCost} />
        </div>
        <div className="ecfo__summary-card">
          <span>System Reliability</span>
          <strong>{reliability.emoji} {reliability.label}</strong>
          <small>{reliability.detail}</small>
        </div>
      </div>

      <Expandable title="Queue technical details" summary={`${d.queueEconomics.estimatedApiCalls.toLocaleString()} API calls`}>
        <div className="ecfo__kpi-grid">
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Items Waiting</span>
            <span className="ecfo__kpi-value">{d.queueEconomics.currentQueue.toLocaleString()}</span>
          </div>
          <div className="ecfo__kpi">
            <span className="ecfo__kpi-label">Est. Token Usage</span>
            <span className="ecfo__kpi-value">{d.queueEconomics.estimatedTokens.toLocaleString()}</span>
          </div>
        </div>
      </Expandable>

      <SectionHead title="Efficiency" subtitle={`Score ${d.efficiencyScore.overall}/100`} />
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
    </div>
  );
});

export const AnalyticsTab = memo(function AnalyticsTab({ d }: { d: ExecutiveDashboard }) {
  const topWorker = d.workerFinancials[0];
  const topLang = d.languageAnalytics[0];
  const topModel = d.modelAnalytics[0];

  return (
    <div className="ecfo__tab-content">
      <div className="ecfo__summary-row">
        {topWorker ? (
          <div className="ecfo__summary-card">
            <span>Top cost driver</span>
            <strong>{topWorker.label}</strong>
            <DualMoney amount={topWorker.cost} />
          </div>
        ) : null}
        {topLang ? (
          <div className="ecfo__summary-card">
            <span>Top language spend</span>
            <strong>{topLang.label}</strong>
            <DualMoney amount={topLang.spend} />
          </div>
        ) : null}
        {topModel ? (
          <div className="ecfo__summary-card">
            <span>Top model</span>
            <strong>{topModel.model}</strong>
            <DualMoney amount={topModel.spend} />
          </div>
        ) : null}
      </div>
      <Expandable title="Cost by team" summary={`${d.workerFinancials.length} workers`}>
        <div className="ecfo__card">
          <table className="ecfo__table">
            <thead>
              <tr><th>Team</th><th>Spend</th><th>Savings</th><th>ROI</th></tr>
            </thead>
            <tbody>
              {d.workerFinancials.map((w) => (
                <tr key={w.worker} id={w.worker}>
                  <td>{w.label}</td>
                  <td><DualMoney amount={w.cost} /></td>
                  <td><DualMoney amount={w.savings} /></td>
                  <td>{w.roi}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Expandable>
      <Expandable title="Cost by language" summary="Regional breakdown">
        <div className="ecfo__split">
          {d.languageAnalytics.map((l) => (
            <div key={l.language} className="ecfo__card">
              <h4>{l.label}</h4>
              <p className="anr-meta">{l.articles} articles</p>
              <DualMoney amount={l.spend} />
            </div>
          ))}
        </div>
      </Expandable>
      <Expandable title="Cost by district" summary={`${d.districtAnalytics.length} districts`}>
        <div className="ecfo__card">
          <table className="ecfo__table">
            <thead>
              <tr><th>District</th><th>Spend</th><th>Articles</th></tr>
            </thead>
            <tbody>
              {d.districtAnalytics.length === 0 ? (
                <tr><td colSpan={3} className="ecfo__placeholder">No district data yet</td></tr>
              ) : (
                d.districtAnalytics.map((row) => (
                  <tr key={row.district}>
                    <td>{row.district}</td>
                    <td><DualMoney amount={row.spend} /></td>
                    <td>{row.articles}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Expandable>
      <Expandable title="Cost by AI model" summary={`${d.modelAnalytics.length} models`}>
        <div className="ecfo__card">
          <table className="ecfo__table">
            <thead>
              <tr><th>Model</th><th>Spend</th><th>Success</th></tr>
            </thead>
            <tbody>
              {d.modelAnalytics.map((m) => (
                <tr key={m.model}>
                  <td>{m.model}</td>
                  <td><DualMoney amount={m.spend} /></td>
                  <td>{m.successRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Expandable>
    </div>
  );
});

export const PlanningTab = memo(function PlanningTab({
  d,
  budgetIdx,
  setBudgetIdx,
  budgetScenario,
  budgetPct,
}: {
  d: ExecutiveDashboard;
  budgetIdx: number;
  setBudgetIdx: (n: number) => void;
  budgetScenario: ExecutiveDashboard["budgetSimulator"]["scenarios"][0] | null;
  budgetPct: number;
}) {
  return (
    <div className="ecfo__tab-content">
      <SectionHead title="Budget Simulator" subtitle="What-if monthly AI budget" />
      <div className="ecfo__card">
        <div className="ecfo__slider-wrap">
          <input
            type="range"
            className="ecfo__slider"
            min={0}
            max={d.budgetSimulator.presets.length - 1}
            value={budgetIdx}
            onChange={(e) => setBudgetIdx(Number(e.target.value))}
            aria-label="Monthly budget scenario"
          />
          <div className="ecfo__slider-labels">
            {d.budgetSimulator.presets.map((p) => (
              <span key={p}>${p}</span>
            ))}
          </div>
        </div>
        {budgetScenario ? (
          <div className="ecfo__summary-row">
            <div className="ecfo__summary-card">
              <span>Monthly budget</span>
              <DualMoney amount={budgetScenario.budget} />
            </div>
            <div className="ecfo__summary-card">
              <span>Articles possible</span>
              <strong className="ecfo__summary-value">{budgetScenario.articlesPossible.toLocaleString()}</strong>
            </div>
            <div className="ecfo__summary-card">
              <span>Yearly burn</span>
              <DualMoney amount={budgetScenario.yearlyBurn} />
            </div>
          </div>
        ) : null}
        <div className="ecfo__budget-bar">
          <div className="ecfo__budget-fill" style={{ width: `${budgetPct}%` }} />
        </div>
      </div>
      <SectionHead title="Growth Forecast" subtitle="Scaling scenarios" />
      <div className="ecfo__card">
        <table className="ecfo__table">
          <thead>
            <tr><th>Articles / Day</th><th>Monthly</th><th>Yearly</th><th>Infra</th></tr>
          </thead>
          <tbody>
            {d.growthForecast.map((g) => (
              <tr key={g.articlesPerDay}>
                <td>{g.articlesPerDay.toLocaleString()}</td>
                <td><DualMoney amount={g.monthlyBill} /></td>
                <td><DualMoney amount={g.yearlyBill} /></td>
                <td><DualMoney amount={g.infrastructureEstimate} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export const InsightsTab = memo(function InsightsTab({
  d,
  onViewRec,
}: {
  d: ExecutiveDashboard;
  onViewRec?: (id: string) => void;
}) {
  return (
    <div className="ecfo__tab-content">
      <SectionHead title="Business Recommendations" subtitle="Actionable cost reductions" />
      <div className="ecfo__rec-list">
        {d.recommendations.map((r) => (
          <RecommendationCard key={r.id} rec={r} onViewDetails={() => onViewRec?.(r.id)} />
        ))}
      </div>
      <SectionHead title="Executive Alerts" subtitle="🟢 Healthy · 🟡 Watch · 🔴 Immediate" />
      <ExecutiveAlertsList d={d} />
    </div>
  );
});

export const ReportsTab = memo(function ReportsTab({
  d,
  reportPeriod,
  setReportPeriod,
  exporting,
  onExport,
  onGenerateDaily,
}: {
  d: ExecutiveDashboard;
  reportPeriod: "daily" | "weekly" | "monthly" | "quarterly";
  setReportPeriod: (p: "daily" | "weekly" | "monthly" | "quarterly") => void;
  exporting: boolean;
  onExport: (f: "csv" | "json" | "pdf") => void;
  onGenerateDaily: () => void;
}) {
  const daily = buildDailyReport(d);

  return (
    <div className="ecfo__tab-content">
      <SectionHead title="Daily Executive Report" subtitle="Auto-generated summary" />
      <div className="ecfo__report-preview">
        <div className="ecfo__report-row">
          <span>Today&apos;s AI Spend</span>
          <DualMoney amount={daily.todaySpend} />
        </div>
        <div className="ecfo__report-row">
          <span>Today&apos;s Revenue</span>
          {daily.todayRevenue ? (
            <DualMoney amount={daily.todayRevenue} />
          ) : (
            <span className="ecfo__placeholder">Not configured</span>
          )}
        </div>
        <div className="ecfo__report-row">
          <span>Cost Per Article</span>
          <DualMoney amount={daily.costPerArticle} />
        </div>
        <div className="ecfo__report-row">
          <span>Articles Published</span>
          <strong>{daily.articlesPublished}</strong>
        </div>
        <div className="ecfo__report-row">
          <span>Queue Health</span>
          <strong>{daily.queueHealth}</strong>
        </div>
        <div className="ecfo__report-row">
          <span>Budget Remaining</span>
          <DualMoney amount={daily.budgetRemaining} />
        </div>
        {daily.topRecommendation ? (
          <div className="ecfo__report-row">
            <span>Top Recommendation</span>
            <div>
              <strong>{daily.topRecommendation.title}</strong>
              <DualMoney amount={daily.topRecommendation.savings} />
            </div>
          </div>
        ) : null}
        {daily.topAlert ? (
          <div className="ecfo__report-row">
            <span>Top Alert</span>
            <strong>{daily.topAlert.title}</strong>
          </div>
        ) : null}
        <button type="button" className="anr-btn anr-btn--primary" onClick={onGenerateDaily}>
          Generate Daily Report
        </button>
      </div>

      <SectionHead title="Export" subtitle="PDF · CSV · JSON" />
      <div className="ecfo__card">
        <div className="ecfo__export-periods">
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
              onClick={() => onExport(f)}
            >
              Export {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
