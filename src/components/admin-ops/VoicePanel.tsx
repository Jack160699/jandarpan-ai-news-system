"use client";

import { useState } from "react";
import { Av3DataTable, Av3EmptyState, Av3Panel, Av3StatusBadge } from "@/components/admin-v3";
import { ageMinutes, formatAge } from "@/lib/admin-ops/health";
import type { OpsView } from "@/lib/admin-ops/snapshot";
import { fmt } from "@/components/admin-ops/OpsPanels";

const secs = (ms: number | null | undefined) => (ms ? `${(ms / 1000).toFixed(1)}s` : "—");
const usd = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `$${n.toFixed(4)}`);

function SamplePlayer({ path }: { path: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  async function load() {
    setState("loading");
    try {
      const res = await fetch(`/api/admin/voice/sample?path=${encodeURIComponent(path)}`, { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; url?: string };
      if (json.ok && json.url) {
        setSrc(json.url);
        setState("idle");
      } else setState("error");
    } catch {
      setState("error");
    }
  }
  if (src) return <audio controls autoPlay src={src} style={{ width: "100%", maxWidth: 320 }} />;
  return (
    <button className="ops-btn" onClick={() => void load()} disabled={state === "loading"}>
      {state === "loading" ? "Loading…" : state === "error" ? "Retry" : "▶ Play"}
    </button>
  );
}

/** Voice generation monitoring + audition of the four verification samples. */
export function VoicePanel({ view, now }: { view: OpsView; now: number }) {
  const { configured, snapshot, samples } = view.voice;
  const s = snapshot;
  return (
    <Av3Panel
      title="Voice — Google TTS"
      subtitle="Gemini-TTS primary, Chirp 3 HD fallback. Generated server-side; audio never blocks publication. Naturalness, pronunciation and pacing must be judged by ear — play the samples."
      action={<Av3StatusBadge label={configured ? "Credentials set" : "Not configured"} tone={configured ? "healthy" : "critical"} />}
    >
      {!configured ? (
        <Av3EmptyState
          title="Google TTS is not configured"
          message="Set GOOGLE_TTS_SERVICE_ACCOUNT_JSON (service account in the billing/credit project) and GOOGLE_CLOUD_PROJECT on Vercel, then apply migration 087."
        />
      ) : null}

      {s ? (
        <>
          <div className="ops-shares">
            <div className="ops-share"><b>{fmt(s.by_status.ready ?? 0)}</b><span>Ready</span></div>
            <div className="ops-share"><b>{fmt((s.by_status.pending ?? 0) + (s.by_status.generating ?? 0))}</b><span>Queued / generating</span></div>
            <div className="ops-share"><b>{fmt((s.by_status.failed ?? 0) + (s.by_status.invalid ?? 0))}</b><span>Failed / invalid</span></div>
            <div className="ops-share"><b>{fmt(s.pending_articles)}</b><span>Fresh stories w/o audio</span></div>
            <div className="ops-share"><b>{secs(s.last_24h.avg_latency_ms)}</b><span>Avg latency (24h)</span></div>
            <div className="ops-share"><b>{fmt(s.last_24h.characters)}</b><span>Characters (24h)</span></div>
            <div className="ops-share"><b>{usd(s.last_24h.estimated_cost_usd)}</b><span>Est. cost (24h)</span></div>
          </div>

          <div className="ops-table-scroll" style={{ marginTop: "0.9rem" }}>
            <Av3DataTable
              rows={s.by_provider_24h}
              rowKey={(p) => `${p.provider}-${p.voice_model}`}
              empty={<p className="ops-kpi__hint">No audio generated in the last 24h.</p>}
              columns={[
                { key: "p", header: "Provider", render: (p) => p.provider },
                { key: "m", header: "Model", render: (p) => p.voice_model },
                { key: "r", header: "Ready", numeric: true, render: (p) => fmt(p.ready) },
                { key: "f", header: "Failed", numeric: true, render: (p) => fmt(p.failed) },
                { key: "l", header: "Avg latency", numeric: true, render: (p) => secs(p.avg_latency_ms) },
                { key: "c", header: "Cost", numeric: true, render: (p) => usd(p.cost_usd) },
              ]}
            />
          </div>

          {s.failure_reasons.length ? (
            <p className="ops-kpi__hint" style={{ marginTop: "0.6rem" }}>
              Failures (7d): {s.failure_reasons.map((f) => `${f.reason} ×${f.n}`).join(" · ")}
            </p>
          ) : null}

          <details style={{ marginTop: "0.75rem" }}>
            <summary>Recent audio ({s.recent.length})</summary>
            <div className="ops-table-scroll">
              <Av3DataTable
                rows={s.recent}
                rowKey={(r) => r.id}
                columns={[
                  { key: "h", header: "Story", render: (r) => r.headline.slice(0, 70) },
                  { key: "l", header: "Lang", render: (r) => r.language },
                  { key: "k", header: "Kind / style", render: (r) => `${r.script_kind} · ${r.style.replaceAll("_", " ")}` },
                  { key: "st", header: "Status", render: (r) => <Av3StatusBadge label={r.status} tone={r.status === "ready" ? "healthy" : r.status === "generating" || r.status === "pending" ? "info" : "critical"} /> },
                  { key: "p", header: "Provider", render: (r) => r.provider ?? "—" },
                  { key: "d", header: "Duration", numeric: true, render: (r) => secs(r.duration_ms) },
                  { key: "a", header: "Tries", numeric: true, render: (r) => r.attempts },
                  { key: "t", header: "Updated", render: (r) => formatAge(ageMinutes(r.updated_at, now)) },
                  { key: "e", header: "Error", render: (r) => r.error ?? "—" },
                ]}
              />
            </div>
          </details>
        </>
      ) : (
        <p className="ops-kpi__hint">Voice tables not available yet — apply migration 087.</p>
      )}

      <h4 style={{ margin: "1rem 0 0.4rem" }}>Verification samples</h4>
      {samples ? (
        <>
          <p className="ops-kpi__hint">
            Generated {formatAge(ageMinutes(samples.at, now))} · run {samples.runId.slice(0, 8)} · {samples.status}
          </p>
          <div className="ops-table-scroll">
            <Av3DataTable
              rows={samples.items}
              rowKey={(i) => i.name}
              columns={[
                { key: "n", header: "Sample", render: (i) => i.label },
                { key: "ok", header: "Result", render: (i) => <Av3StatusBadge label={i.ok ? "valid" : "failed"} tone={i.ok ? "healthy" : "critical"} /> },
                { key: "p", header: "Provider / voice", render: (i) => (i.provider ? `${i.provider} · ${i.voiceName ?? ""}${i.fallbackUsed ? " (fallback)" : ""}` : "—") },
                { key: "d", header: "Duration", numeric: true, render: (i) => secs(i.durationMs) },
                { key: "l", header: "Latency", numeric: true, render: (i) => secs(i.latencyMs) },
                { key: "c", header: "Chars", numeric: true, render: (i) => fmt(i.characters) },
                { key: "co", header: "Est. cost", numeric: true, render: (i) => usd(i.estimatedCostUsd) },
                { key: "pl", header: "Listen", render: (i) => (i.storagePath ? <SamplePlayer path={i.storagePath} /> : (i.error ?? i.validationFailures?.join("; ") ?? "—")) },
              ]}
            />
          </div>
        </>
      ) : (
        <p className="ops-kpi__hint">
          No samples yet. Use “Generate voice test samples” under Run now, then listen for pronunciation, pauses, naturalness, clarity and speed.
        </p>
      )}
    </Av3Panel>
  );
}
