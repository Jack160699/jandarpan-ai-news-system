/**
 * Editorial efficiency view (from public.admin_editorial_efficiency, migration 099).
 *
 * Recorded numbers only. A ratio whose denominator is zero is null ("no data"), never 0 and never invented. Nothing here claims an
 * improvement: it reports what the usage log recorded in the window.
 *
 * Policy guard: CodeCraft Pro is the primary bulk editorial engine. Gemini calls on editorial operations are surfaced loudly,
 * because Gemini Flash-Lite is a limited free quota that must not become the article engine by accident.
 */

import type { Tone } from "@/lib/admin-ops/types";

export type EfficiencyRaw = {
  window_hours: number;
  generate: { calls: number; ok: number; avg_latency_ms: number | null };
  repair: { calls: number; ok: number; avg_latency_ms: number | null };
  repair_pct: number | null;
  tokens: number;
  events_with_calls: number;
  articles: {
    generated: number;
    approved: number;
    not_publish: number;
    rejection_pct: number | null;
    repaired_flag: number;
    avg_depth_retries: number | null;
  };
  tokens_per_approved_article: number | null;
  per_model: Array<{
    provider: string;
    model: string;
    operation: string;
    calls: number;
    ok: number;
    avg_latency_ms: number | null;
    tokens: number;
  }>;
};

export type EfficiencyView = {
  windowHours: number;
  generate: EfficiencyRaw["generate"] & { okPct: number | null };
  repair: EfficiencyRaw["repair"] & { okPct: number | null };
  repairPct: number | null;
  repairTone: Tone;
  rejectionPct: number | null;
  rejectionTone: Tone;
  tokens: number;
  tokensPerApprovedArticle: number | null;
  articles: EfficiencyRaw["articles"];
  models: EfficiencyRaw["per_model"];
  /** Editorial calls that went to Gemini. Non-zero means the article path used the limited Gemini quota. */
  geminiEditorialCalls: number;
  codecraftEditorialCalls: number;
  providerPolicy: {
    codecraftPrimary: boolean;
    geminiEditorialCallsTone: Tone;
    message: string;
  };
};

const pct = (num: number, den: number): number | null => (den > 0 ? Math.round((1000 * num) / den) / 10 : null);

export function buildEfficiencyView(raw: EfficiencyRaw): EfficiencyView {
  const models = raw.per_model ?? [];
  const sumCalls = (provider: string) =>
    models.filter((m) => m.provider === provider).reduce((s, m) => s + Number(m.calls ?? 0), 0);
  const geminiEditorialCalls = sumCalls("gemini");
  const codecraftEditorialCalls = sumCalls("codecraft");

  const repairPct = raw.repair_pct;
  const rejectionPct = raw.articles?.rejection_pct ?? null;

  return {
    windowHours: raw.window_hours,
    generate: { ...raw.generate, okPct: pct(raw.generate.ok, raw.generate.calls) },
    repair: { ...raw.repair, okPct: pct(raw.repair.ok, raw.repair.calls) },
    repairPct,
    // Thresholds are presentation only: >50% of drafts needing a second paid pass is a problem worth looking at.
    repairTone: repairPct === null ? "healthy" : repairPct > 50 ? "critical" : repairPct > 25 ? "warning" : "healthy",
    rejectionPct,
    rejectionTone: rejectionPct === null ? "healthy" : rejectionPct > 30 ? "critical" : rejectionPct > 15 ? "warning" : "healthy",
    tokens: Number(raw.tokens ?? 0),
    tokensPerApprovedArticle: raw.tokens_per_approved_article,
    articles: raw.articles,
    models,
    geminiEditorialCalls,
    codecraftEditorialCalls,
    providerPolicy: {
      codecraftPrimary: codecraftEditorialCalls >= geminiEditorialCalls,
      geminiEditorialCallsTone: geminiEditorialCalls === 0 ? "healthy" : "critical",
      message:
        geminiEditorialCalls === 0
          ? "CodeCraft Pro is handling article generation; no Gemini editorial calls in this window."
          : `${geminiEditorialCalls} editorial call(s) went to Gemini in this window. Gemini Flash-Lite is a limited quota and must not be the article engine; check GEMINI_EDITORIAL_FALLBACK and CodeCraft health.`,
    },
  };
}
