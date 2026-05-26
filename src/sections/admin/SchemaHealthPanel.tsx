"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-newsroom/AdminShell";
import type { SchemaHealthReport } from "@/lib/supabase/schema-health";
import { CRITICAL_SCHEMA_CHECKSUM_V1 } from "@/lib/supabase/schema-checksum";

export function SchemaHealthPanel() {
  const [report, setReport] = useState<SchemaHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/schema/health", { credentials: "include" });
      const data = (await res.json()) as SchemaHealthReport & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to load schema health");
        setReport(null);
      } else {
        setReport(data);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function reloadPostgrest() {
    setReloading(true);
    try {
      const res = await fetch("/api/admin/schema/health", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.report) {
        setReport(data.report as SchemaHealthReport);
      }
    } finally {
      setReloading(false);
    }
  }

  const failed = report?.checks.filter((c) => !c.ok) ?? [];

  return (
    <AdminShell
      title="Schema & migrations"
      subtitle="Production drift detection, PostgREST cache, migration status"
    >
      <div className="anr-panel space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="anr-btn anr-btn--primary" onClick={() => void load()} disabled={loading}>
            {loading ? "Checking…" : "Re-run checks"}
          </button>
          <button
            type="button"
            className="anr-btn anr-btn--ghost"
            onClick={() => void reloadPostgrest()}
            disabled={reloading}
          >
            {reloading ? "Reloading…" : "Reload PostgREST schema"}
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {report && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Status" value={report.ok ? "Healthy" : "Drift detected"} ok={report.ok} />
              <Stat label="Latest migration" value={report.migrationLatest} />
              <Stat
                label="Checksum"
                value={report.checksumMatch ? "Match" : "Mismatch"}
                ok={report.checksumMatch}
              />
              <Stat label="Checked" value={new Date(report.checkedAt).toLocaleString()} />
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
              <p className="text-zinc-400">Live checksum</p>
              <p className="mt-1 font-mono text-zinc-200">{report.schemaChecksum ?? "—"}</p>
              <p className="mt-3 text-zinc-400">Expected (v1)</p>
              <p className="mt-1 font-mono text-zinc-200">
                {report.expectedChecksum ?? CRITICAL_SCHEMA_CHECKSUM_V1}
              </p>
            </div>

            {report.postgrestReload && (
              <p className="text-sm text-zinc-400">
                PostgREST reload:{" "}
                {report.postgrestReload.ok ? (
                  <span className="text-emerald-400">ok</span>
                ) : (
                  <span className="text-amber-400">{report.postgrestReload.error}</span>
                )}
              </p>
            )}

            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Checks</h3>
              <ul className="mt-3 space-y-1.5">
                {report.checks.map((c) => (
                  <li key={c.id} className="flex justify-between text-sm">
                    <span className="font-mono text-zinc-400">{c.id}</span>
                    <span className={c.ok ? "text-emerald-400" : "text-red-400"}>
                      {c.ok ? "ok" : "fail"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {failed.length > 0 && (
              <p className="text-sm text-amber-400">
                Apply migration 034_production_schema_stabilization.sql and run{" "}
                <code className="text-zinc-300">npm run schema:verify</code>.
              </p>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={
          ok === true
            ? "mt-1 text-lg font-semibold text-emerald-400"
            : ok === false
              ? "mt-1 text-lg font-semibold text-red-400"
              : "mt-1 text-lg font-semibold text-zinc-100"
        }
      >
        {value}
      </p>
    </div>
  );
}
