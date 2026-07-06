import type { ExecutiveDashboard } from "@/lib/observability/executive-dashboard";

export type TabId =
  | "overview"
  | "financials"
  | "operations"
  | "analytics"
  | "planning"
  | "insights"
  | "trends"
  | "reports";

export type Money = {
  usdLabel: string;
  inrLabel: string;
  usd?: number;
  inr?: number;
};

export type StatusTone = "success" | "warn" | "danger";

export type ExecutiveAlert = {
  id: string;
  category: "healthy" | "watch" | "immediate";
  title: string;
  message: string;
};

export type SearchResult = {
  id: string;
  label: string;
  sublabel?: string;
  tab: TabId;
  highlightId?: string;
};

export function hasNoAiUsage(d: ExecutiveDashboard): boolean {
  return (
    d.overview.monthlySpend.usd < 0.0001 &&
    d.overview.todaySpend.usd < 0.0001 &&
    d.workerFinancials.length === 0
  );
}

export function projectedMonthEnd(d: ExecutiveDashboard): Money {
  const recent = d.trends.cost.slice(-7);
  const avgDaily = recent.length
    ? recent.reduce((s, c) => s + c.usd, 0) / recent.length
    : d.overview.todaySpend.usd ?? 0;
  const now = new Date();
  const daysRemaining = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const projected = d.overview.monthlySpend.usd + avgDaily * daysRemaining;
  return formatMoney(projected, d.exchangeRate);
}

export function dailyBurnRate(d: ExecutiveDashboard): Money {
  const recent = d.trends.cost.slice(-7);
  const avg =
    recent.length > 0
      ? recent.reduce((s, c) => s + c.usd, 0) / recent.length
      : d.overview.todaySpend.usd ?? 0;
  return formatMoney(avg, d.exchangeRate);
}

export function formatMoney(usd: number, rate: number): Money {
  return {
    usd,
    inr: usd * rate,
    usdLabel: `$${usd.toFixed(usd >= 1 ? 2 : 4)}`,
    inrLabel: `₹${(usd * rate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}

export function budgetPct(d: ExecutiveDashboard): number {
  return d.budgetSimulator.selectedBudgetUsd > 0
    ? Math.min(100, (d.overview.monthlySpend.usd / d.budgetSimulator.selectedBudgetUsd) * 100)
    : 0;
}

export function budgetLimitMoney(d: ExecutiveDashboard): Money {
  return formatMoney(d.budgetSimulator.selectedBudgetUsd, d.exchangeRate);
}

export function budgetLastsDays(d: ExecutiveDashboard): number | null {
  const burn = dailyBurnRate(d).usd ?? 0;
  if (burn <= 0) return null;
  return Math.round(d.overview.budgetRemaining.usd / burn);
}

export function potentialOptimizationSavings(d: ExecutiveDashboard): Money {
  const total = d.recommendations.reduce((s, r) => s + r.potentialSavings.usd, 0);
  return formatMoney(total, d.exchangeRate);
}

export function queueHealthSummary(d: ExecutiveDashboard) {
  const q = d.queueEconomics.currentQueue;
  if (d.alerts.worker.triggered) {
    return {
      emoji: "🔴",
      label: "Needs Attention",
      tone: "danger" as const,
      detail: "Processing failures detected",
      completion: "Investigate worker errors",
    };
  }
  if (d.alerts.queue.triggered || q > 300) {
    return {
      emoji: "🟡",
      label: "Backlog Building",
      tone: "warn" as const,
      detail: `${q.toLocaleString()} items waiting`,
      completion: `Est. completion: ${d.queueEconomics.estimatedRuntime}`,
    };
  }
  if (q === 0) {
    return {
      emoji: "🟢",
      label: "All Clear",
      tone: "success" as const,
      detail: "No articles waiting",
      completion: "Queue is empty",
    };
  }
  return {
    emoji: "🟢",
    label: "Healthy",
    tone: "success" as const,
    detail: `${q} items in queue`,
    completion: `Clears in ${d.queueEconomics.estimatedRuntime}`,
  };
}

export function platformStatus(d: ExecutiveDashboard) {
  const openAiHealthy = !d.alerts.openai.triggered;
  const workerHealthy = !d.alerts.worker.triggered;
  const score = d.efficiencyScore.overall;
  if (!openAiHealthy || !workerHealthy) {
    return { emoji: "🔴", label: "Degraded", tone: "danger" as const, detail: "AI services need attention" };
  }
  if (score < 60 || d.alerts.cost.triggered) {
    return { emoji: "🟡", label: "Fair", tone: "warn" as const, detail: "Some efficiency gaps detected" };
  }
  return { emoji: "🟢", label: "Healthy", tone: "success" as const, detail: "AI platform operating normally" };
}

export function systemReliability(d: ExecutiveDashboard) {
  const retryWorkers = d.workerFinancials.reduce((s, w) => s + w.retries, 0);
  if (d.alerts.worker.triggered) {
    return { emoji: "🔴", label: "At Risk", detail: "Worker failures detected" };
  }
  if (retryWorkers > 10) {
    return { emoji: "🟡", label: "Good", detail: "Some retries observed" };
  }
  return { emoji: "🟢", label: "Excellent", detail: "Minimal retries & failures" };
}

export function topAlert(d: ExecutiveDashboard) {
  const critical = d.anomalies.find((a) => a.severity === "critical");
  if (critical) {
    return {
      severity: "critical" as const,
      category: "immediate" as const,
      title: critical.type.replace(/_/g, " "),
      message: critical.message,
    };
  }
  const budgetAlert = [...d.alerts.budget].reverse().find((b) => b.triggered);
  if (budgetAlert) {
    return {
      severity: "warning" as const,
      category: "watch" as const,
      title: `Budget ${budgetAlert.threshold}% used`,
      message: budgetAlert.message,
    };
  }
  if (d.alerts.cost.triggered) {
    return {
      severity: "warning" as const,
      category: "watch" as const,
      title: "Spend above normal",
      message: d.alerts.cost.message,
    };
  }
  if (d.alerts.queue.triggered) {
    return {
      severity: "warning" as const,
      category: "watch" as const,
      title: "Queue backlog increasing",
      message: d.alerts.queue.message,
    };
  }
  const warning = d.anomalies[0];
  if (warning) {
    return {
      severity: "warning" as const,
      category: "watch" as const,
      title: warning.type.replace(/_/g, " "),
      message: warning.message,
    };
  }
  return {
    severity: "ok" as const,
    category: "healthy" as const,
    title: "No critical alerts",
    message: "All systems operating normally.",
  };
}

export function buildExecutiveAlerts(d: ExecutiveDashboard): ExecutiveAlert[] {
  const alerts: ExecutiveAlert[] = [];

  if (d.alerts.queue.triggered) {
    alerts.push({
      id: "queue",
      category: "watch",
      title: "Queue backlog increasing",
      message: d.alerts.queue.message,
    });
  }
  if (d.alerts.cost.triggered) {
    alerts.push({
      id: "cost",
      category: "watch",
      title: "OpenAI spend above normal",
      message: d.alerts.cost.message,
    });
  }
  const translation = d.languageAnalytics.find((l) => l.language === "hi" || l.label === "Hindi");
  if (translation && translation.spend.usd > d.overview.monthlySpend.usd * 0.35) {
    alerts.push({
      id: "translation",
      category: "watch",
      title: "Translation costs rising",
      message: `Hindi translation accounts for significant monthly spend (${translation.spend.usdLabel}).`,
    });
  }
  for (const b of d.alerts.budget) {
    if (b.triggered) {
      alerts.push({
        id: `budget-${b.threshold}`,
        category: Number(b.threshold) >= 90 ? "immediate" : "watch",
        title: `Budget ${b.threshold}% used`,
        message: b.message,
      });
    }
  }
  if (d.businessKpis.avgLatencyMs > 15000) {
    alerts.push({
      id: "latency",
      category: "watch",
      title: "OpenAI latency increased",
      message: `Average response time is ${Math.round(d.businessKpis.avgLatencyMs / 1000)}s.`,
    });
  }
  for (const a of d.anomalies) {
    alerts.push({
      id: a.id,
      category: a.severity === "critical" ? "immediate" : "watch",
      title: a.type.replace(/_/g, " "),
      message: a.message,
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: "healthy",
      category: "healthy",
      title: "All systems healthy",
      message: "No issues requiring executive attention.",
    });
  }
  return alerts;
}

export function buildHeroSummary(d: ExecutiveDashboard) {
  const platform = platformStatus(d);
  const queue = queueHealthSummary(d);
  const alert = topAlert(d);
  const monthEnd = projectedMonthEnd(d);
  const budget = budgetLimitMoney(d);

  return {
    platform,
    queue,
    alert,
    monthEnd,
    budget,
    lines: [
      { label: "Today's AI spend", money: d.overview.todaySpend },
      { label: "Projected monthly spend", money: monthEnd },
      { label: "Monthly budget", money: budget },
      { label: "Estimated savings this month", money: d.savings.thisMonth },
    ],
  };
}

export function recommendationDifficulty(priority: "high" | "medium" | "low"): "Low" | "Medium" | "High" {
  if (priority === "high") return "Low";
  if (priority === "medium") return "Medium";
  return "High";
}

export function lastActivityHints(d: ExecutiveDashboard) {
  const costDays = [...d.trends.cost].reverse().find((c) => c.usd > 0);
  const lastOpenAi = costDays?.date ?? null;
  const lastArticle =
    d.businessKpis.generatedToday > 0
      ? "Today"
      : d.businessKpis.publishedToday > 0
        ? "Published today"
        : "No recent activity";
  return {
    lastOpenAi: lastOpenAi ? new Date(lastOpenAi).toLocaleDateString() : "No requests recorded",
    lastArticle,
    lastWorker: new Date(d.generatedAt).toLocaleString(),
  };
}

export function buildSearchIndex(d: ExecutiveDashboard): SearchResult[] {
  const results: SearchResult[] = [];

  for (const w of d.workerFinancials) {
    results.push({
      id: `worker-${w.worker}`,
      label: w.label,
      sublabel: `Spend ${w.cost.usdLabel}`,
      tab: "analytics",
      highlightId: w.worker,
    });
  }
  for (const l of d.languageAnalytics) {
    results.push({
      id: `lang-${l.language}`,
      label: l.label,
      sublabel: `Language · ${l.spend.usdLabel}`,
      tab: "analytics",
    });
  }
  for (const dist of d.districtAnalytics) {
    results.push({
      id: `dist-${dist.district}`,
      label: dist.district,
      sublabel: "District",
      tab: "analytics",
    });
  }
  for (const m of d.modelAnalytics) {
    results.push({
      id: `model-${m.model}`,
      label: m.model,
      sublabel: "AI Model",
      tab: "analytics",
    });
  }
  for (const r of d.recommendations) {
    results.push({
      id: `rec-${r.id}`,
      label: r.title,
      sublabel: "Recommendation",
      tab: "insights",
      highlightId: r.id,
    });
  }
  for (const a of buildExecutiveAlerts(d)) {
    if (a.id !== "healthy") {
      results.push({
        id: `alert-${a.id}`,
        label: a.title,
        sublabel: "Alert",
        tab: "insights",
      });
    }
  }

  results.push(
    { id: "nav-financials", label: "Monthly Spend", sublabel: "Financials", tab: "financials" },
    { id: "nav-queue", label: "Queue Health", sublabel: "Operations", tab: "operations" },
    { id: "nav-budget", label: "Budget Simulator", sublabel: "Planning", tab: "planning" },
    { id: "nav-trends", label: "Spend Trends", sublabel: "Trends", tab: "trends" },
    { id: "nav-reports", label: "Executive Report", sublabel: "Reports", tab: "reports" }
  );

  return results;
}

export function buildDailyReport(d: ExecutiveDashboard) {
  const queue = queueHealthSummary(d);
  const alert = topAlert(d);
  const topRec = d.recommendations[0];
  return {
    generatedAt: d.generatedAt,
    exchangeRate: d.exchangeRate,
    todaySpend: d.overview.todaySpend,
    todayRevenue: d.profitability.todayRevenue,
    costPerArticle: d.profitability.costPerPublishedArticle,
    articlesPublished: d.businessKpis.publishedToday,
    queueHealth: queue.label,
    budgetRemaining: d.overview.budgetRemaining,
    topRecommendation: topRec
      ? { title: topRec.title, savings: topRec.potentialSavings }
      : null,
    topAlert: alert.title !== "No critical alerts" ? alert : null,
  };
}
