"use client";

import { useState } from "react";
import { Av3Panel } from "@/components/admin-v3";
import { RUN_ACTION_IDS, RUN_ACTION_META, type RunActionId } from "@/lib/admin-ops/run-actions-meta";

/**
 * Safe operational controls. Authorization, audit logging, rate limiting and overlap protection are
 * enforced server-side by POST /api/admin/ops/run; this component only reflects the outcome.
 */
export function RunControls({ canRun, onDone }: { canRun: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState<RunActionId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function run(action: RunActionId) {
    setBusy(action);
    setToast(null);
    try {
      const res = await fetch("/api/admin/ops/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { ok: boolean; runId?: string; error?: string; retryAfterSec?: number };
      if (res.ok && json.ok) {
        setToast(`${RUN_ACTION_META[action].label}: started · run ${json.runId?.slice(0, 8)}`);
        window.setTimeout(onDone, 4_000);
      } else if (res.status === 429) {
        setToast(`Rate limited — try again in ${json.retryAfterSec ?? "a few"}s`);
      } else if (res.status === 409) {
        setToast("Already running — wait for it to finish");
      } else if (res.status === 401 || res.status === 403) {
        setToast("Your role is not allowed to run this");
      } else {
        setToast(`Failed: ${json.error ?? res.status}`);
      }
    } catch {
      setToast("Network error");
    } finally {
      setBusy(null);
      window.setTimeout(() => setToast(null), 9_000);
    }
  }

  return (
    <Av3Panel title="Run now" subtitle="Every run is authorised, audited, rate limited, non-overlapping, and returns a run id.">
      <div className="ops-runs">
        {RUN_ACTION_IDS.map((id) => (
          <div key={id} className="ops-run">
            <strong>{RUN_ACTION_META[id].label}</strong>
            <p>{RUN_ACTION_META[id].description}</p>
            <button className="ops-btn ops-btn--primary" disabled={!canRun || busy !== null} onClick={() => void run(id)}>
              {busy === id ? "Starting…" : canRun ? "Run" : "Not permitted"}
            </button>
          </div>
        ))}
      </div>
      {toast ? <div className="ops-toast" role="status">{toast}</div> : null}
    </Av3Panel>
  );
}
