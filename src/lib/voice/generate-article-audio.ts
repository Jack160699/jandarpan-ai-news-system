/**
 * Article audio generation (server-only): plan → claim → synthesize (with failover) → validate →
 * store (private bucket) → record. Audio is fully decoupled from publication: nothing here can
 * delay or fail an article, and a failed attempt is retried with backoff and never re-billed
 * for the same voice configuration (unique key on article/language/kind/style/voice).
 */

import { createHash } from "node:crypto";
import { createAdminServerClient } from "@/lib/supabase";
import { getDistrict } from "@/lib/regional/districts";
import {
  buildNewsScript,
  pickDeliveryStyle,
  type NewsScript,
} from "@/lib/voice/script/news-script";
import { estimateTtsCostUsd } from "@/lib/voice/providers";
import { synthesizeWithFallback } from "@/lib/voice/synthesize";
import { geminiModel, resolveGeminiVoice } from "@/lib/voice/voice-config";
import { validateGeneratedAudio } from "@/lib/voice/validate-audio";
import type { DeliveryStyle, ScriptKind, VoiceLanguage } from "@/lib/voice/types";

export const AUDIO_BUCKET = "article-audio";
export const SIGNED_URL_TTL_SEC = 3600;

export type AudioArticle = {
  id: string;
  headline: string;
  summary: string | null;
  article_body: string | null;
  language: string | null;
  tags?: string[] | null;
  editorial_metadata?: Record<string, unknown> | null;
  geo_metadata?: Record<string, unknown> | null;
};

export type AudioPlan = {
  language: VoiceLanguage;
  kind: ScriptKind;
  style: DeliveryStyle;
  script: NewsScript;
  voiceModel: string;
  voiceName: string;
  scriptHash: string;
};

export function voiceLanguageFor(articleLanguage: string | null | undefined): VoiceLanguage | null {
  if (articleLanguage === "hi") return "hi-IN";
  if (articleLanguage === "en") return "en-IN";
  return null;
}

export function planAudio(article: AudioArticle, kind: ScriptKind): AudioPlan | null {
  const language = voiceLanguageFor(article.language);
  if (!language) return null;
  const lang = language === "hi-IN" ? "hi" : "en";
  const meta = (article.editorial_metadata ?? {}) as Record<string, unknown>;
  const geo = (article.geo_metadata ?? {}) as Record<string, unknown>;

  // Only an evidence-based district (scope DISTRICT_SPECIFIC) may appear in a dateline.
  const districtSlug =
    geo.scope === "DISTRICT_SPECIFIC" && typeof geo.primary_district === "string" ? (geo.primary_district as string) : null;
  const district = districtSlug ? getDistrict(districtSlug) : null;
  const isBreaking = Boolean(meta.is_breaking || meta.breaking_override);

  const style = pickDeliveryStyle({
    headline: article.headline,
    summary: article.summary,
    category: article.tags?.[0] ?? null,
    urgencyScore: typeof meta.breaking_score === "number" ? (meta.breaking_score as number) : null,
    isBreaking,
  });

  const script = buildNewsScript({
    language: lang,
    kind,
    headline: article.headline,
    summary: article.summary,
    body: article.article_body,
    district: district ? (lang === "hi" ? district.nameHi : district.name) : null,
    isBreaking,
  });

  const voiceModel = geminiModel();
  const voiceName = resolveGeminiVoice(language, style);
  const scriptHash = createHash("sha256")
    .update([script.text, language, style, voiceModel, voiceName].join("|"))
    .digest("hex")
    .slice(0, 16);
  return { language, kind, style, script, voiceModel, voiceName, scriptHash };
}

const ARTICLE_COLUMNS = "id,headline,summary,article_body,language,tags,editorial_metadata,geo_metadata";

/** Create pending audio rows for recently published articles that have none. */
export async function enqueueRecentArticleAudio(options: {
  kind?: ScriptKind;
  sinceHours?: number;
  limit?: number;
}): Promise<{ scanned: number; enqueued: number; skipped: number }> {
  const supabase = createAdminServerClient();
  const kind = options.kind ?? "radio";
  const since = new Date(Date.now() - (options.sinceHours ?? 24) * 3_600_000).toISOString();

  const { data: articles } = await supabase
    .from("generated_articles")
    .select(ARTICLE_COLUMNS)
    .gte("published_at", since)
    .in("editorial_status", ["approved", "published", "live"])
    .order("published_at", { ascending: false })
    .limit(options.limit ?? 30);

  const rows = (articles ?? []) as unknown as AudioArticle[];
  if (!rows.length) return { scanned: 0, enqueued: 0, skipped: 0 };

  const { data: existing } = await supabase
    .from("article_audio" as never)
    .select("article_id")
    .eq("script_kind", kind)
    .in("article_id", rows.map((r) => r.id));
  const have = new Set(((existing ?? []) as Array<{ article_id: string }>).map((e) => e.article_id));

  const inserts: Array<Record<string, unknown>> = [];
  let skipped = 0;
  for (const a of rows) {
    if (have.has(a.id)) continue;
    const plan = planAudio(a, kind);
    if (!plan || plan.script.wordCount < 8) {
      skipped++;
      continue;
    }
    inserts.push({
      article_id: a.id,
      language: plan.language,
      script_kind: plan.kind,
      style: plan.style,
      voice_model: plan.voiceModel,
      voice_name: plan.voiceName,
      script: plan.script.text,
      script_hash: plan.scriptHash,
      status: "pending",
      characters: plan.script.text.length,
      metadata: { estimated_seconds: plan.script.estimatedSeconds, word_count: plan.script.wordCount },
    });
  }
  if (inserts.length) {
    await supabase
      .from("article_audio" as never)
      .upsert(inserts as never, { onConflict: "article_id,language,script_kind,style,voice_model,voice_name", ignoreDuplicates: true });
  }
  return { scanned: rows.length, enqueued: inserts.length, skipped };
}

type AudioRow = {
  id: string;
  article_id: string;
  language: VoiceLanguage;
  script_kind: ScriptKind;
  style: DeliveryStyle;
  voice_model: string;
  voice_name: string;
  script: string;
  script_hash: string;
  attempts: number;
  metadata: Record<string, unknown> | null;
};

const backoffSeconds = (attempts: number) => Math.min(3600, 60 * 2 ** Math.max(attempts - 1, 0));

function scriptFromRow(row: AudioRow): NewsScript {
  const paragraphs = row.script.split(/\n\n+/).map((p) => p.split(/(?<=[।.!?])\s+/).filter(Boolean));
  const words = row.script.split(/\s+/).filter(Boolean).length;
  const meta = row.metadata ?? {};
  return {
    kind: row.script_kind,
    language: row.language === "hi-IN" ? "hi" : "en",
    paragraphs,
    text: row.script,
    wordCount: words,
    estimatedSeconds: typeof meta.estimated_seconds === "number" ? (meta.estimated_seconds as number) : Math.round(words / 2.4),
    truncated: false,
  };
}

export type ProcessOutcome = {
  id: string;
  ok: boolean;
  status: "ready" | "failed" | "invalid";
  provider?: string;
  durationMs?: number;
  latencyMs?: number;
  error?: string;
};

export async function processAudioRow(row: AudioRow): Promise<ProcessOutcome> {
  const supabase = createAdminServerClient();
  const script = scriptFromRow(row);
  const update = async (patch: Record<string, unknown>) => {
    await supabase
      .from("article_audio" as never)
      .update({ ...patch, updated_at: new Date().toISOString() } as never)
      .eq("id", row.id);
  };

  const outcome = await synthesizeWithFallback({ script, language: row.language, style: row.style });
  const attemptsLog = outcome.attempts;

  if (!outcome.ok) {
    const permanentSkip = outcome.error === "no_healthy_tts_provider";
    await update({
      status: "failed",
      error: outcome.error.slice(0, 500),
      next_attempt_at: new Date(Date.now() + (permanentSkip ? 1800 : backoffSeconds(row.attempts)) * 1000).toISOString(),
      metadata: { ...(row.metadata ?? {}), attempts: attemptsLog },
    });
    return { id: row.id, ok: false, status: "failed", error: outcome.error };
  }

  const { result } = outcome;
  const validation = validateGeneratedAudio({
    audio: result.audio,
    script: row.script,
    language: row.language,
    expectedSeconds: script.estimatedSeconds,
  });

  const cost = estimateTtsCostUsd(result.provider, result.characters, (validation.durationMs ?? 0) / 1000);
  const common = {
    provider: result.provider,
    provider_request_id: result.requestId,
    latency_ms: result.latencyMs,
    characters: result.characters,
    estimated_cost_usd: Math.round(cost * 1e6) / 1e6,
    validation,
    metadata: { ...(row.metadata ?? {}), attempts: attemptsLog, fallback_used: outcome.fallbackUsed, actual_voice: { model: result.model, name: result.voiceName } },
  };

  if (!validation.ok) {
    const terminal = row.attempts >= 3;
    await update({
      ...common,
      status: terminal ? "invalid" : "failed",
      error: `validation_failed: ${validation.failures.join("; ")}`.slice(0, 500),
      duration_ms: validation.durationMs,
      next_attempt_at: new Date(Date.now() + backoffSeconds(row.attempts) * 1000).toISOString(),
    });
    return { id: row.id, ok: false, status: terminal ? "invalid" : "failed", provider: result.provider, error: validation.failures.join("; ") };
  }

  const path = `${row.article_id}/${row.language}/${row.script_kind}-${row.style}-${row.script_hash.slice(0, 8)}.mp3`;
  const { error: uploadError } = await supabase.storage.from(AUDIO_BUCKET).upload(path, result.audio, {
    contentType: "audio/mpeg",
    upsert: true,
  });
  if (uploadError) {
    await update({
      ...common,
      status: "failed",
      error: `storage_upload_failed: ${uploadError.message}`.slice(0, 500),
      next_attempt_at: new Date(Date.now() + backoffSeconds(row.attempts) * 1000).toISOString(),
    });
    return { id: row.id, ok: false, status: "failed", provider: result.provider, error: uploadError.message };
  }

  await update({
    ...common,
    status: "ready",
    error: null,
    storage_path: path,
    duration_ms: validation.durationMs,
    generated_at: new Date().toISOString(),
    next_attempt_at: null,
  });
  return {
    id: row.id,
    ok: true,
    status: "ready",
    provider: result.provider,
    durationMs: validation.durationMs ?? undefined,
    latencyMs: result.latencyMs,
  };
}

/** Enqueue fresh stories, claim a bounded batch, and synthesize sequentially within the time budget. */
export async function runAudioBatch(options: {
  limit?: number;
  kind?: ScriptKind;
  shouldStop?: () => boolean;
}): Promise<{ enqueued: number; claimed: number; ready: number; failed: number; outcomes: ProcessOutcome[] }> {
  const supabase = createAdminServerClient();
  const enq = await enqueueRecentArticleAudio({ kind: options.kind });

  const { data } = await supabase.rpc("claim_audio_jobs" as never, { p_limit: options.limit ?? 4, p_stuck_minutes: 10 } as never);
  const rows = ((data ?? []) as unknown) as AudioRow[];

  const outcomes: ProcessOutcome[] = [];
  for (const row of rows) {
    if (options.shouldStop?.()) {
      // Return unstarted claimed rows to the queue.
      await supabase
        .from("article_audio" as never)
        .update({ status: "pending", attempts: Math.max(0, row.attempts - 1), updated_at: new Date().toISOString() } as never)
        .eq("id", row.id);
      continue;
    }
    outcomes.push(await processAudioRow(row));
  }
  return {
    enqueued: enq.enqueued,
    claimed: rows.length,
    ready: outcomes.filter((o) => o.ok).length,
    failed: outcomes.filter((o) => !o.ok).length,
    outcomes,
  };
}

export async function getSignedPlaybackUrl(storagePath: string, ttlSec = SIGNED_URL_TTL_SEC): Promise<string | null> {
  const { data, error } = await createAdminServerClient().storage.from(AUDIO_BUCKET).createSignedUrl(storagePath, ttlSec);
  return error ? null : (data?.signedUrl ?? null);
}
