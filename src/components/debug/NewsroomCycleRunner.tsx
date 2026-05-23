"use client";

import { useState } from "react";

type CycleResponse = {
  ok: boolean;
  durationMs: number;
  degraded?: boolean;
  blockers?: string[];
  delta?: Record<string, number>;
  pipelineHealth?: Record<string, unknown>;
  error?: string;
};

export function NewsroomCycleRunner() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CycleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCycle() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/debug/run-newsroom-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshHomepage: true }),
      });
      const json = (await res.json()) as CycleResponse & { error?: string };
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
      } else {
        setResult(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "request_failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="text-sm font-semibold text-zinc-200">Run full cycle</h2>
      <p className="mt-1 text-xs text-zinc-500">
        RSS/API ingest → clustering → AI editorial → homepage revalidate (dev only)
      </p>
      <button
        type="button"
        onClick={runCycle}
        disabled={loading}
        className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
      >
        {loading ? "Running pipeline…" : "Run newsroom cycle"}
      </button>
      {error && (
        <p className="mt-3 font-mono text-xs text-red-400">{error}</p>
      )}
      {result && (
        <pre className="mt-4 max-h-96 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
