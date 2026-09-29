"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Av3StatusBadge } from "@/components/admin-v3";
import type { OpsView } from "@/lib/admin-ops/snapshot";
import "@/styles/admin-ops.css";
import {
  FailurePanel,
  FreshnessPanel,
  FunnelPanel,
  GeoPanel,
  JobsPanel,
  KpiRow,
  LanguagePanel,
  PerformancePanel,
  ProvidersPanel,
  SourcesPanel,
  SubsystemPanel,
  ToneDot,
  useNow,
} from "@/components/admin-ops/OpsPanels";
import { RunControls } from "@/components/admin-ops/RunControls";
import { VoicePanel } from "@/components/admin-ops/VoicePanel";
import { UsersPanel } from "@/components/admin-ops/UsersPanel";

const POLL_MS = Number(process.env.NEXT_PUBLIC_ADMIN_OPS_POLL_MS) || 60_000;

/**
 * The newsroom operational control center. Server-rendered with a real snapshot, then polled
 * every minute (paused while the tab is hidden). Every number comes from the database.
 */
export function OpsCommandCenter({
  initial,
  canRun,
  canViewUsers,
}: {
  initial: OpsView;
  canRun: boolean;
  canViewUsers: boolean;
}) {
  const [view, setView] = useState<OpsView>(initial);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const now = useNow(view.generatedAt);
  const inflight = useRef(false);

  const refresh = useCallback(async (fresh = false) => {
    if (inflight.current) return;
    inflight.current = true;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/ops/snapshot${fresh ? "?fresh=1" : ""}`, { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; view?: OpsView; error?: string };
      if (json.ok && json.view) {
        setView(json.view);
        setError(null);
      } else {
        setError(json.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "refresh failed");
    } finally {
      inflight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) void refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const generated = new Date(view.generatedAt).toISOString().slice(11, 19);

  return (
    <div className="ops-root">
      <header className="ops-topbar">
        <div>
          <div className="ops-topbar__status">
            <ToneDot tone={view.overall} />
            {view.overall === "healthy" ? "All critical systems operating" : view.overall === "warning" ? "Degraded — attention needed" : "Critical — the pipeline needs intervention"}
            <Av3StatusBadge label={view.overall} tone={view.overall} />
          </div>
          <div className="ops-topbar__meta">
            Snapshot {generated}Z · query {view.snapshotLatencyMs}ms · refreshes every {Math.round(POLL_MS / 1000)}s
            {error ? ` · last refresh failed: ${error}` : ""}
          </div>
        </div>
        <div className="ops-topbar__actions">
          <button className="ops-btn" onClick={() => void refresh(true)} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh now"}
          </button>
        </div>
      </header>

      <KpiRow view={view} />
      <FreshnessPanel view={view} now={now} />
      <FunnelPanel view={view} />
      <div className="ops-grid ops-grid--2">
        <SubsystemPanel view={view} now={now} />
        <RunControls canRun={canRun} onDone={() => void refresh(true)} />
      </div>
      <SourcesPanel view={view} now={now} />
      <div className="ops-grid ops-grid--2">
        <GeoPanel view={view} now={now} />
        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <LanguagePanel view={view} />
          <FailurePanel view={view} />
        </div>
      </div>
      <PerformancePanel view={view} />
      <ProvidersPanel view={view} now={now} />
      <VoicePanel view={view} now={now} />
      <JobsPanel view={view} now={now} />
      {canViewUsers ? <UsersPanel total={view.users.total} /> : null}
    </div>
  );
}
