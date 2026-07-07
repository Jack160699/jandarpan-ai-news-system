"use client";

import { memo, useEffect, useState } from "react";
import type { ExecutiveDashboard } from "@/lib/observability/executive-dashboard";
import type { Money, TabId } from "@/sections/admin/executive-cfo-helpers";
import {
  buildExecutiveAlerts,
  buildHeroSummary,
  budgetLastsDays,
  budgetPct,
  dailyBurnRate,
  hasNoAiUsage,
  lastActivityHints,
  platformStatus,
  potentialOptimizationSavings,
  projectedMonthEnd,
  queueHealthSummary,
  recommendationDifficulty,
  systemReliability,
  topAlert,
} from "@/sections/admin/executive-cfo-helpers";
import { EDITORIAL_CAPACITY } from "@/lib/newsroom/editorial-capacity";

function resolveEditionWindow(now = new Date()): {
  current: string;
  next: string;
} {
  // Edition scheduler windows (IST): 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
  const tz = "Asia/Kolkata";
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const currentMins = hour * 60 + minute;
  const slots = [360, 540, 720, 900, 1080, 1260]; // 06:00..21:00

  const fmt = (mins: number) => {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    return `${h}:${m}`;
  };

  const nextSlot = slots.find((s) => s > currentMins) ?? slots[0]!;
  const currentSlot = [...slots].reverse().find((s) => s <= currentMins) ?? slots[slots.length - 1]!;

  return { current: fmt(currentSlot), next: fmt(nextSlot) };
}

function workerCost(d: ExecutiveDashboard, label: string) {
  return d.workerFinancials.find((w) => w.label.toLowerCase() === label.toLowerCase())?.cost ?? null;
}

export function DualMoney({
  amount,
  compact,
  className,
}: {
  amount: Money;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`ecfo__money${className ? ` ${className}` : ""}`}>
      <span className={compact ? "ecfo__money-usd ecfo__money-usd--compact" : "ecfo__money-usd"}>
        {amount.usdLabel}
      </span>
      <span className={compact ? "ecfo__money-inr ecfo__money-inr--compact" : "ecfo__money-inr"}>
        ({amount.inrLabel})
      </span>
    </div>
  );
}

export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const steps = 20;
    let step = 0;
    const id = window.setInterval(() => {
      step++;
      setDisplay(Math.round(start + (diff * step) / steps));
      if (step >= steps) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

export function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="ecfo__section-head">
      <h3>{title}</h3>
      {subtitle ? <span>{subtitle}</span> : null}
    </div>
  );
}

export function Expandable({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="ecfo__expand" open={defaultOpen}>
      <summary>
        <span className="ecfo__expand-title">{title}</span>
        {summary ? <span className="ecfo__expand-summary">{summary}</span> : null}
      </summary>
      <div className="ecfo__expand-body">{children}</div>
    </details>
  );
}

export const ExecutiveHero = memo(function ExecutiveHero({ d }: { d: ExecutiveDashboard }) {
  const hero = buildHeroSummary(d);
  const empty = hasNoAiUsage(d);
  const hints = lastActivityHints(d);

  if (empty) {
    return (
      <section className="ecfo__hero ecfo__hero--empty" aria-label="Executive summary">
        <div className="ecfo__hero-status">
          <span className="ecfo__hero-emoji" aria-hidden>⚪</span>
          <div>
            <h2 className="ecfo__hero-title">Awaiting AI Activity</h2>
            <p className="ecfo__hero-sub">
              No AI usage has been recorded since deployment.
            </p>
          </div>
        </div>
        <ul className="ecfo__hero-hints">
          <li>Last OpenAI request: {hints.lastOpenAi}</li>
          <li>Last article generated: {hints.lastArticle}</li>
          <li>Dashboard refreshed: {hints.lastWorker}</li>
        </ul>
      </section>
    );
  }

  return (
    <section className="ecfo__hero" aria-label="Executive summary">
      <div className="ecfo__hero-status">
        <span className="ecfo__hero-emoji" aria-hidden>
          {hero.platform.emoji}
        </span>
        <div>
          <h2 className="ecfo__hero-title">AI Platform {hero.platform.label}</h2>
          <p className="ecfo__hero-sub">{hero.platform.detail}</p>
        </div>
      </div>
      <div className="ecfo__hero-grid">
        {hero.lines.map((line) => (
          <div key={line.label} className="ecfo__hero-line">
            <span className="ecfo__hero-line-label">{line.label}</span>
            <DualMoney amount={line.money} compact />
          </div>
        ))}
        <div className="ecfo__hero-line">
          <span className="ecfo__hero-line-label">Queue</span>
          <strong>
            {hero.queue.emoji} {hero.queue.label}
          </strong>
        </div>
        <div className="ecfo__hero-line">
          <span className="ecfo__hero-line-label">Alerts</span>
          <strong>
            {hero.alert.category === "healthy"
              ? "🟢 No critical alerts"
              : `${hero.alert.category === "immediate" ? "🔴" : "🟡"} ${hero.alert.title}`}
          </strong>
        </div>
      </div>
    </section>
  );
});

export function KpiCard({
  label,
  icon,
  tone,
  onClick,
  children,
  ariaLabel,
}: {
  label: string;
  icon?: string;
  tone?: "success" | "warn" | "danger" | "primary";
  onClick?: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`ecfo__kpi-card${tone ? ` ecfo__kpi-card--${tone}` : ""}${onClick ? " ecfo__kpi-card--clickable" : ""}`}
      onClick={onClick}
      aria-label={ariaLabel ?? (onClick ? `View ${label}` : undefined)}
    >
      {icon ? (
        <span className="ecfo__kpi-icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="ecfo__kpi-label">{label}</span>
      {children}
      {onClick ? <span className="ecfo__kpi-arrow" aria-hidden>→</span> : null}
    </Tag>
  );
}

export const BudgetCard = memo(function BudgetCard({
  d,
  onNavigate,
}: {
  d: ExecutiveDashboard;
  onNavigate?: () => void;
}) {
  const pct = budgetPct(d);
  const monthEnd = projectedMonthEnd(d);
  const burn = dailyBurnRate(d);
  const filled = Math.round(pct / 10);

  return (
    <div className="ecfo__budget-card">
      <div className="ecfo__budget-card-head">
        <span className="ecfo__kpi-label">Monthly Budget</span>
        {onNavigate ? (
          <button type="button" className="ecfo__link-btn" onClick={onNavigate}>
            Simulator →
          </button>
        ) : null}
      </div>
      <div className="ecfo__budget-blocks" aria-hidden>
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={i < filled ? "is-filled" : ""} />
        ))}
      </div>
      <div className="ecfo__budget-split">
        <div>
          <span className="ecfo__budget-split-label">Spent</span>
          <DualMoney amount={d.overview.monthlySpend} compact />
        </div>
        <div>
          <span className="ecfo__budget-split-label">Remaining</span>
          <DualMoney amount={d.overview.budgetRemaining} compact />
        </div>
      </div>
      <p className="ecfo__budget-meta">Used: {pct.toFixed(0)}%</p>
      <p className="ecfo__budget-meta">
        Burn rate: {burn.usdLabel}/day <span className="ecfo__budget-inr">({burn.inrLabel}/day)</span>
      </p>
      <p className="ecfo__budget-meta ecfo__budget-meta--projected">
        Projected month: {monthEnd.usdLabel} <span className="ecfo__budget-inr">({monthEnd.inrLabel})</span>
      </p>
    </div>
  );
});

export const ForecastCard = memo(function ForecastCard({ d }: { d: ExecutiveDashboard }) {
  const days = budgetLastsDays(d);
  const opt = potentialOptimizationSavings(d);

  return (
    <div className="ecfo__forecast-card">
      <SectionHead title="Financial Forecast" subtitle="Current pace analysis" />
      <div className="ecfo__forecast-grid">
        <div className="ecfo__forecast-item">
          <span>Budget lasts</span>
          <strong>{days != null ? `${days} days` : "—"}</strong>
          <small>At current burn rate</small>
        </div>
        <div className="ecfo__forecast-item">
          <span>Projected yearly AI spend</span>
          <DualMoney amount={d.profitability.yearlyProjection} />
        </div>
        <div className="ecfo__forecast-item ecfo__forecast-item--success">
          <span>Potential optimization savings</span>
          <DualMoney amount={opt} />
          <small>From active recommendations</small>
        </div>
      </div>
    </div>
  );
});

export const OverviewTab = memo(function OverviewTab({
  d,
  onNavigate,
}: {
  d: ExecutiveDashboard;
  onNavigate: (tab: TabId) => void;
}) {
  const empty = hasNoAiUsage(d);
  const monthEnd = projectedMonthEnd(d);
  const queue = queueHealthSummary(d);
  const platform = platformStatus(d);
  const alert = topAlert(d);
  const reliability = systemReliability(d);
  const capacity = EDITORIAL_CAPACITY.dailyLimit;
  const published = d.businessKpis.publishedToday;
  const remainingQuota = Math.max(0, capacity - published);
  const edition = resolveEditionWindow();
  const imageCost = workerCost(d, "Images");
  const translationCost = workerCost(d, "Translation");

  if (empty) {
    return (
      <div className="ecfo__overview ecfo__overview--empty">
        <p className="ecfo__empty-msg">
          No AI usage has been recorded since deployment. Metrics will appear after the first
          OpenAI API calls.
        </p>
      </div>
    );
  }

  return (
    <div className="ecfo__overview">
      <div className="ecfo__overview-grid">
        <KpiCard label="Daily Capacity" icon="🏁">
          <span className="ecfo__overview-stat">{capacity}</span>
          <span className="ecfo__overview-sub">All editions (IST)</span>
        </KpiCard>

        <KpiCard label="Remaining Quota" icon="🧮" tone={remainingQuota <= 5 ? "warn" : undefined}>
          <span className="ecfo__overview-stat">{remainingQuota}</span>
          <span className="ecfo__overview-sub">{published} published</span>
        </KpiCard>

        <KpiCard label="Current Edition" icon="🕒">
          <span className="ecfo__overview-stat">{edition.current}</span>
          <span className="ecfo__overview-sub">Next: {edition.next}</span>
        </KpiCard>

        <KpiCard
          label="Today's AI Cost"
          icon="💰"
          tone="primary"
          onClick={() => onNavigate("financials")}
        >
          <DualMoney amount={d.overview.todaySpend} compact />
        </KpiCard>

        <KpiCard label="AI Cost" icon="🤖" onClick={() => onNavigate("analytics")}>
          <DualMoney amount={d.overview.todaySpend} compact />
        </KpiCard>

        <KpiCard label="Image Cost" icon="🖼️" onClick={() => onNavigate("analytics")}>
          {imageCost ? <DualMoney amount={imageCost} compact /> : <span className="ecfo__placeholder">—</span>}
        </KpiCard>

        <KpiCard label="Translation Cost" icon="🌐" onClick={() => onNavigate("analytics")}>
          {translationCost ? (
            <DualMoney amount={translationCost} compact />
          ) : (
            <span className="ecfo__placeholder">—</span>
          )}
        </KpiCard>

        <KpiCard label="Monthly Spend" icon="📊" onClick={() => onNavigate("financials")}>
          <DualMoney amount={d.overview.monthlySpend} compact />
        </KpiCard>

        <KpiCard label="Projected Month Spend" icon="📈" onClick={() => onNavigate("planning")}>
          <DualMoney amount={monthEnd} compact />
        </KpiCard>

        <KpiCard label="Budget Remaining" icon="🏦" onClick={() => onNavigate("financials")}>
          <DualMoney amount={d.overview.budgetRemaining} compact />
        </KpiCard>

        <KpiCard label="Cost Per Article" icon="📰" onClick={() => onNavigate("analytics")}>
          <DualMoney amount={d.profitability.costPerPublishedArticle} compact />
        </KpiCard>

        <KpiCard label="Articles Published Today" icon="✅">
          <span className="ecfo__overview-stat">
            <AnimatedNumber value={d.businessKpis.publishedToday} />
          </span>
          <span className="ecfo__overview-sub">{d.businessKpis.generatedToday} generated</span>
        </KpiCard>

        <KpiCard label="Breaking Queue" icon="🚨">
          <span className="ecfo__overview-stat">—</span>
          <span className="ecfo__overview-sub">Immediate publish uses override</span>
        </KpiCard>

        <KpiCard label="Ready Queue" icon="📬" onClick={() => onNavigate("operations")}>
          <span className="ecfo__overview-stat">—</span>
          <span className="ecfo__overview-sub">Scheduled-for-publish backlog</span>
        </KpiCard>

        <KpiCard
          label="Queue Health"
          icon={queue.emoji}
          tone={queue.tone}
          onClick={() => onNavigate("operations")}
        >
          <span className="ecfo__overview-stat">{queue.label}</span>
          <span className="ecfo__overview-sub">{queue.completion}</span>
        </KpiCard>

        <KpiCard
          label="AI Platform Status"
          icon={platform.emoji}
          tone={platform.tone}
          onClick={() => onNavigate("operations")}
        >
          <span className="ecfo__overview-stat">{platform.label}</span>
          <span className="ecfo__overview-sub">Reliability: {reliability.label}</span>
        </KpiCard>
      </div>

      <div className="ecfo__overview-bottom">
        <BudgetCard d={d} onNavigate={() => onNavigate("planning")} />
        <KpiCard
          label="Top Alert"
          tone={alert.category === "immediate" ? "danger" : alert.category === "watch" ? "warn" : "success"}
          onClick={() => onNavigate("insights")}
        >
          <span className="ecfo__overview-stat">{alert.title}</span>
          <span className="ecfo__overview-sub">{alert.message}</span>
        </KpiCard>
      </div>
    </div>
  );
});

export function ExecutiveAlertsList({ d }: { d: ExecutiveDashboard }) {
  const alerts = buildExecutiveAlerts(d);
  const categoryEmoji = { healthy: "🟢", watch: "🟡", immediate: "🔴" };
  const categoryLabel = { healthy: "Healthy", watch: "Watch", immediate: "Immediate Action" };

  return (
    <div className="ecfo__exec-alerts" role="list" aria-label="Executive alerts">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`ecfo__exec-alert ecfo__exec-alert--${a.category}`}
          role="listitem"
        >
          <span className="ecfo__exec-alert-cat" aria-hidden>
            {categoryEmoji[a.category]} {categoryLabel[a.category]}
          </span>
          <strong>{a.title}</strong>
          <p>{a.message}</p>
        </div>
      ))}
    </div>
  );
}

export function RecommendationCard({
  rec,
  onViewDetails,
}: {
  rec: ExecutiveDashboard["recommendations"][0];
  onViewDetails?: () => void;
}) {
  return (
    <article className="ecfo__rec ecfo__rec--v2" id={rec.id}>
      <div className="ecfo__rec-check" aria-hidden>
        ✓
      </div>
      <div className="ecfo__rec-body">
        <h4 className="ecfo__rec-title">{rec.title}</h4>
        <p className="ecfo__rec-desc">{rec.description}</p>
        <div className="ecfo__rec-meta">
          <span>
            Priority: <strong className={`ecfo__badge ecfo__badge--${rec.priority}`}>{rec.priority}</strong>
          </span>
          <span>
            Difficulty: <strong>{recommendationDifficulty(rec.priority)}</strong>
          </span>
        </div>
        <div className="ecfo__rec-savings-block">
          <span className="ecfo__rec-savings-label">Estimated monthly savings</span>
          <DualMoney amount={rec.potentialSavings} />
        </div>
        {onViewDetails ? (
          <button type="button" className="ecfo__link-btn" onClick={onViewDetails}>
            View Details →
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function LastUpdated({ updatedAt, onRefresh }: { updatedAt: string; onRefresh: () => void }) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const tick = () => {
      setSecs(Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [updatedAt]);

  return (
    <div className="ecfo__updated" aria-live="polite">
      <span>
        Last updated: <strong>{secs}s ago</strong>
      </span>
      <button
        type="button"
        className="anr-btn anr-btn--ghost ecfo__refresh-btn"
        onClick={onRefresh}
        aria-label="Refresh metrics"
      >
        Refresh
      </button>
    </div>
  );
}
