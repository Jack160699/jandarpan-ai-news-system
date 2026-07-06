"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ExecutiveDashboard } from "@/lib/observability/executive-dashboard";
import { EmptyState } from "@/components/admin-newsroom/ui/EmptyState";
import {
  ExecutiveHero,
  LastUpdated,
  OverviewTab,
} from "@/sections/admin/ExecutiveCfoUi";
import {
  AnalyticsTab,
  FinancialsTab,
  InsightsTab,
  OperationsTab,
  PlanningTab,
  ReportsTab,
} from "@/sections/admin/ExecutiveCfoTabs";
import {
  buildDailyReport,
  buildSearchIndex,
  budgetPct,
  type SearchResult,
  type TabId,
} from "@/sections/admin/executive-cfo-helpers";

const ExecutiveCfoCharts = dynamic(
  () => import("@/sections/admin/ExecutiveCfoCharts").then((m) => m.ExecutiveCfoCharts),
  { ssr: false, loading: () => <div className="anr-skeleton ecfo__chart-skeleton" /> }
);

const POLL_MS = 60_000;

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "financials", label: "Financials" },
  { id: "operations", label: "Operations" },
  { id: "analytics", label: "Analytics" },
  { id: "planning", label: "Planning" },
  { id: "insights", label: "Insights" },
  { id: "trends", label: "Trends" },
  { id: "reports", label: "Reports" },
];

function CommandCenter({
  open,
  onToggle,
  onRefresh,
  onReport,
  onNavigate,
}: {
  open: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onReport: () => void;
  onNavigate: (tab: TabId) => void;
}) {
  return (
    <div className="ecfo__command">
      {open ? (
        <div className="ecfo__command-menu" role="menu" aria-label="Quick actions">
          <button type="button" role="menuitem" onClick={onRefresh}>Refresh Metrics</button>
          <button type="button" role="menuitem" onClick={onReport}>Generate Report</button>
          <button type="button" role="menuitem" onClick={() => onNavigate("analytics")}>View Cost Breakdown</button>
          <button type="button" role="menuitem" onClick={() => onNavigate("operations")}>View Queue</button>
          <button type="button" role="menuitem" onClick={() => onNavigate("insights")}>Run Diagnostics</button>
        </div>
      ) : null}
      <button
        type="button"
        className="ecfo__command-fab"
        onClick={onToggle}
        aria-expanded={open}
        aria-label="Command center quick actions"
      >
        ⚡
      </button>
    </div>
  );
}

function GlobalSearch({
  results,
  query,
  onQuery,
  onSelect,
  open,
  onClose,
}: {
  results: SearchResult[];
  query: string;
  onQuery: (q: string) => void;
  onSelect: (r: SearchResult) => void;
  open: boolean;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="ecfo__search-overlay" role="dialog" aria-label="Search dashboard">
      <div className="ecfo__search-panel">
        <input
          ref={inputRef}
          type="search"
          className="ecfo__search-input"
          placeholder="Search workers, languages, districts, models, alerts…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-label="Search dashboard"
        />
        <button type="button" className="ecfo__search-close" onClick={onClose} aria-label="Close search">
          ✕
        </button>
        <ul className="ecfo__search-results" role="listbox">
          {results.length === 0 ? (
            <li className="ecfo__search-empty">No results</li>
          ) : (
            results.slice(0, 12).map((r) => (
              <li key={r.id}>
                <button type="button" role="option" onClick={() => onSelect(r)}>
                  <strong>{r.label}</strong>
                  {r.sublabel ? <span>{r.sublabel}</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export function ExecutiveCfoPanel() {
  const [data, setData] = useState<ExecutiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [budgetIdx, setBudgetIdx] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<"daily" | "weekly" | "monthly" | "quarterly">("daily");
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightRec, setHighlightRec] = useState<string | null>(null);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navigate = useCallback((t: TabId) => setTab(t), []);

  const searchIndex = useMemo(() => (data ? buildSearchIndex(data) : []), [data]);
  const filteredSearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchIndex;
    return searchIndex.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.sublabel?.toLowerCase().includes(q)
    );
  }, [searchIndex, searchQuery]);

  const budgetScenario = useMemo(() => {
    if (!data) return null;
    const idx = Math.min(budgetIdx, data.budgetSimulator.scenarios.length - 1);
    return data.budgetSimulator.scenarios[idx] ?? data.budgetSimulator.scenarios[0];
  }, [data, budgetIdx]);

  const pct = useMemo(() => (data ? budgetPct(data) : 0), [data]);

  const handleExport = useCallback(
    async (format: "csv" | "json" | "pdf") => {
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
          a.download = `executive-cfo-${reportPeriod}.json`;
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
    },
    [reportPeriod]
  );

  const handleDailyReport = useCallback(() => {
    if (!data) return;
    const report = buildDailyReport(data);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `executive-daily-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setTab("reports");
  }, [data]);

  const handleSearchSelect = useCallback((r: SearchResult) => {
    setTab(r.tab);
    setSearchOpen(false);
    setSearchQuery("");
    if (r.highlightId) setHighlightRec(r.highlightId);
  }, []);

  if (loading && !data) {
    return (
      <div className="ecfo ecfo--v2">
        <div className="anr-skeleton ecfo__hero-skeleton" />
      </div>
    );
  }

  if (error && !data) {
    return <EmptyState title="Executive dashboard unavailable" hint={error} />;
  }

  if (!data) return null;

  return (
    <div className="ecfo ecfo--v2">
      <ExecutiveHero d={data} />

      <header className="ecfo__toolbar ecfo__toolbar--sticky">
        <nav className="ecfo__tabs" role="tablist" aria-label="Executive dashboard sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className={`ecfo__tab${tab === t.id ? " is-active" : ""}`}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => {
                const idx = TABS.findIndex((x) => x.id === t.id);
                if (e.key === "ArrowRight") setTab(TABS[(idx + 1) % TABS.length]!.id);
                if (e.key === "ArrowLeft") setTab(TABS[(idx - 1 + TABS.length) % TABS.length]!.id);
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="ecfo__toolbar-actions">
          <button
            type="button"
            className="ecfo__search-trigger"
            onClick={() => setSearchOpen(true)}
            aria-label="Search dashboard (Ctrl+K)"
          >
            🔍 Search
          </button>
          <LastUpdated updatedAt={data.generatedAt} onRefresh={() => void load()} />
        </div>
      </header>

      <div
        className="ecfo__panel"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === "overview" && <OverviewTab d={data} onNavigate={navigate} />}
        {tab === "financials" && <FinancialsTab d={data} />}
        {tab === "operations" && <OperationsTab d={data} />}
        {tab === "analytics" && <AnalyticsTab d={data} />}
        {tab === "planning" && (
          <PlanningTab
            d={data}
            budgetIdx={budgetIdx}
            setBudgetIdx={setBudgetIdx}
            budgetScenario={budgetScenario}
            budgetPct={pct}
          />
        )}
        {tab === "insights" && (
          <InsightsTab
            d={data}
            onViewRec={(id) => {
              setHighlightRec(id);
              document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        )}
        {tab === "trends" && (
          <div className="ecfo__tab-content">
            <ExecutiveCfoCharts data={data} />
          </div>
        )}
        {tab === "reports" && (
          <ReportsTab
            d={data}
            reportPeriod={reportPeriod}
            setReportPeriod={setReportPeriod}
            exporting={exporting}
            onExport={(f) => void handleExport(f)}
            onGenerateDaily={handleDailyReport}
          />
        )}
      </div>

      <CommandCenter
        open={commandOpen}
        onToggle={() => setCommandOpen((o) => !o)}
        onRefresh={() => void load()}
        onReport={handleDailyReport}
        onNavigate={navigate}
      />

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        query={searchQuery}
        onQuery={setSearchQuery}
        results={filteredSearch}
        onSelect={handleSearchSelect}
      />

      {highlightRec ? (
        <div className="ecfo__toast" role="status">
          Highlighting: {highlightRec}
          <button type="button" onClick={() => setHighlightRec(null)} aria-label="Dismiss">✕</button>
        </div>
      ) : null}
    </div>
  );
}
