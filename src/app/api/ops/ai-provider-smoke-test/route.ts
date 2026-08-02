/**
 * POST /api/ops/ai-provider-smoke-test — minimal real-provider verification.
 *
 * Deliberately NOT under /api/debug/* — that whole path prefix is blocked
 * at the edge on every deployed environment (confirmed: even pre-existing
 * /api/debug/* routes 404 there on Preview, not just this one), independent
 * of each route's own in-code production guard.
 *
 * Open on Preview/dev (VERCEL_ENV !== "production"). In Production, closed
 * by default and only reachable with a valid "ops"-capability cron secret
 * (same verifyCronRequest gate the cron routes use) — controlled,
 * authenticated one-off verification after a real deploy, not a public
 * debug endpoint. Never reachable in Production without that secret.
 *
 * Makes exactly one real call per provider/model combination under test —
 * free-tier quotas here are scarce (gemini-3.6-flash is 20 requests/day
 * total), so this intentionally does not loop or retry.
 */

import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { requestChatCompletion } from "@/lib/ai/providers/chat";
import { requestGeminiChat } from "@/lib/ai/providers/gemini";
import { CLOUDFLARE_EMBEDDING_DIMENSIONS, requestCloudflareEmbeddings } from "@/lib/ai/providers/cloudflare-embeddings";
import { requestCloudflareImageGeneration } from "@/lib/ai/providers/cloudflare-images";

export const runtime = "nodejs";
export const maxDuration = 60;

function isPreviewOrDev(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

type CaseResult = {
  case: string;
  ok: boolean;
  provider?: string;
  model?: string;
  dimensions?: number;
  width?: number;
  height?: number;
  steps?: number;
  errorCode?: string;
  errorMessage?: string;
  snippet?: string;
};

export async function POST(request: Request) {
  if (!isPreviewOrDev()) {
    const auth = await verifyCronRequest(request, { capability: "ops" });
    if (!auth.authorized) return cronAuthFailureResponse(auth);
  }

  let body: { cases?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine — default to all cases
  }
  const requested = new Set(
    body.cases?.length ? body.cases : ["gemini_normal", "gemini_lightweight", "gemini_premium", "groq_review", "cloudflare_embedding", "cloudflare_image"]
  );

  const results: CaseResult[] = [];
  let groqModelList: string[] | { error: string } | undefined;
  let groqRawDiagnostic: unknown;

  if (requested.has("groq_raw_diagnostic")) {
    const key = process.env.GROQ_API_KEY?.trim();
    if (!key) {
      groqRawDiagnostic = { error: "GROQ_API_KEY not set" };
    } else {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [
              { role: "system", content: "You are a terse test assistant. Reply with strict JSON only." },
              { role: "user", content: 'Reply with exactly this JSON: {"passed": true}' },
            ],
            temperature: 0.35,
            max_tokens: 100,
            response_format: { type: "json_object" },
          }),
        });
        const bodyText = await res.text();
        groqRawDiagnostic = { status: res.status, body: bodyText.slice(0, 800) };
      } catch (err) {
        groqRawDiagnostic = { error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  let groqDiagMatrix: unknown;
  if (requested.has("groq_diag_matrix")) {
    const key = process.env.GROQ_API_KEY?.trim();
    if (!key) {
      groqDiagMatrix = { error: "GROQ_API_KEY not set" };
    } else {
      const models = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b", "llama-3.3-70b-versatile"];
      const variants: Array<{ label: string; extra: Record<string, unknown> }> = [
        { label: "max_tokens, no json mode", extra: { max_tokens: 100 } },
        { label: "max_completion_tokens, no json mode", extra: { max_completion_tokens: 100 } },
        { label: "max_tokens, json mode", extra: { max_tokens: 100, response_format: { type: "json_object" } } },
        {
          label: "max_completion_tokens, json mode",
          extra: { max_completion_tokens: 100, response_format: { type: "json_object" } },
        },
      ];
      const results: Array<{ model: string; variant: string; status: number | null; body: string }> = [];
      for (const model of models) {
        for (const variant of variants) {
          try {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model,
                temperature: 0.35,
                messages: [
                  { role: "system", content: "You are a terse test assistant. Reply with strict JSON only." },
                  { role: "user", content: 'Reply with exactly this JSON: {"passed": true}' },
                ],
                ...variant.extra,
              }),
            });
            const bodyText = await res.text();
            results.push({ model, variant: variant.label, status: res.status, body: bodyText.slice(0, 400) });
          } catch (err) {
            results.push({
              model,
              variant: variant.label,
              status: null,
              body: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
      groqDiagMatrix = results;
    }
  }

  if (requested.has("groq_models")) {
    const key = process.env.GROQ_API_KEY?.trim();
    if (!key) {
      groqModelList = { error: "GROQ_API_KEY not set" };
    } else {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) {
          groqModelList = { error: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
        } else {
          const json = (await res.json()) as { data?: Array<{ id: string }> };
          groqModelList = (json.data ?? []).map((m) => m.id);
        }
      } catch (err) {
        groqModelList = { error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  if (requested.has("gemini_normal")) {
    const r = await requestGeminiChat({
      operation: "editorial_generate",
      system: "You are a terse test assistant. Reply with exactly one short sentence.",
      user: "Say hello in one short sentence.",
      maxTokens: 60,
      context: { worker: "ai_provider_smoke_test" },
    });
    results.push(
      r.ok
        ? { case: "gemini_normal", ok: true, provider: r.provider, snippet: r.content.slice(0, 120) }
        : { case: "gemini_normal", ok: false, provider: r.provider, errorCode: r.error.code, errorMessage: r.error.message }
    );
  }

  if (requested.has("gemini_lightweight")) {
    const r = await requestGeminiChat({
      operation: "classification_lightweight",
      system: "You are a terse test assistant. Reply with exactly one word.",
      user: "Reply with the single word: ok",
      maxTokens: 20,
      context: { worker: "ai_provider_smoke_test" },
    });
    results.push(
      r.ok
        ? { case: "gemini_lightweight", ok: true, provider: r.provider, snippet: r.content.slice(0, 60) }
        : { case: "gemini_lightweight", ok: false, provider: r.provider, errorCode: r.error.code, errorMessage: r.error.message }
    );
  }

  if (requested.has("gemini_premium")) {
    const r = await requestGeminiChat({
      operation: "editorial_generate",
      system: "You are a terse test assistant. Reply with exactly one short sentence.",
      user: "Say hello in one short sentence.",
      maxTokens: 60,
      premium: true,
      premiumReason: "manual_smoke_test",
      context: { worker: "ai_provider_smoke_test" },
    });
    results.push(
      r.ok
        ? { case: "gemini_premium", ok: true, provider: r.provider, snippet: r.content.slice(0, 120) }
        : { case: "gemini_premium", ok: false, provider: r.provider, errorCode: r.error.code, errorMessage: r.error.message }
    );
  }

  if (requested.has("groq_review_gpt_oss_direct")) {
    // Isolates openai/gpt-oss-120b specifically (model override bypasses the
    // in-provider fallback chain) at a realistic token budget — gpt-oss is a
    // reasoning model whose "reasoning" preamble consumes completion tokens
    // before the visible JSON content, so a too-tight maxTokens can truncate
    // valid JSON mid-object. independent-review.ts (the real caller) sets no
    // maxTokens override and inherits the 1400 default; groq_review below
    // deliberately caps at 100 to stay cheap, which is NOT representative
    // for this specific model.
    const r = await requestChatCompletion({
      operation: "editorial_review",
      model: "openai/gpt-oss-120b",
      system: "You are a terse test assistant. Reply with strict JSON only.",
      user: 'Reply with exactly this JSON: {"passed": true, "issues": [], "sensitivity_flags": [], "confidence": 0.9}',
      jsonMode: true,
      maxTokens: 400,
      context: { worker: "ai_provider_smoke_test" },
    });
    results.push(
      r.ok
        ? { case: "groq_review_gpt_oss_direct", ok: true, provider: r.provider, snippet: r.content.slice(0, 160) }
        : {
            case: "groq_review_gpt_oss_direct",
            ok: false,
            provider: r.provider,
            errorCode: r.error.code,
            errorMessage: r.error.message,
          }
    );
  }

  if (requested.has("groq_review")) {
    const r = await requestChatCompletion({
      operation: "editorial_review",
      system: "You are a terse test assistant. Reply with strict JSON only.",
      user: 'Reply with exactly this JSON: {"passed": true, "issues": [], "sensitivity_flags": [], "confidence": 0.9}',
      jsonMode: true,
      maxTokens: 100,
      context: { worker: "ai_provider_smoke_test" },
    });
    results.push(
      r.ok
        ? { case: "groq_review", ok: true, provider: r.provider, snippet: r.content.slice(0, 160) }
        : { case: "groq_review", ok: false, provider: r.provider, errorCode: r.error.code, errorMessage: r.error.message }
    );
  }

  if (requested.has("cloudflare_embedding")) {
    const r = await requestCloudflareEmbeddings({
      operation: "ai_provider_smoke_test",
      texts: ["This is a minimal smoke-test sentence for embedding verification."],
      context: { worker: "ai_provider_smoke_test" },
    });
    results.push(
      "vectors" in r
        ? {
            case: "cloudflare_embedding",
            ok: true,
            provider: "cloudflare",
            model: r.model,
            dimensions: r.vectors[0]?.length,
          }
        : { case: "cloudflare_embedding", ok: false, errorCode: r.error.code, errorMessage: r.error.message }
    );
  }

  if (requested.has("cloudflare_image")) {
    const width = 512;
    const height = 512;
    const steps = 4;
    const r = await requestCloudflareImageGeneration({
      operation: "ai_provider_smoke_test",
      prompt: "A simple test illustration of a newspaper, flat vector style.",
      width,
      height,
      steps,
      context: { worker: "ai_provider_smoke_test" },
    });
    results.push(
      "url" in r
        ? { case: "cloudflare_image", ok: true, provider: "cloudflare", width, height, steps }
        : { case: "cloudflare_image", ok: false, errorCode: r.error.code, errorMessage: r.error.message }
    );
  }

  return NextResponse.json(
    {
      ok: results.every((r) => r.ok),
      results,
      expectedEmbeddingDimensions: CLOUDFLARE_EMBEDDING_DIMENSIONS,
      ...(groqModelList !== undefined ? { groqModelList } : {}),
      ...(groqRawDiagnostic !== undefined ? { groqRawDiagnostic } : {}),
      ...(groqDiagMatrix !== undefined ? { groqDiagMatrix } : {}),
    },
    { status: 200, headers: noStoreHeaders() }
  );
}
