/**
 * POST /api/ops/ai-provider-smoke-test — minimal real-provider verification.
 *
 * Deliberately NOT under /api/debug/* — that whole path prefix is blocked
 * at the edge on every deployed environment (confirmed: even pre-existing
 * /api/debug/* routes 404 there on Preview, not just this one), independent
 * of each route's own in-code production guard.
 *
 * Gated on VERCEL_ENV !== "production" specifically (not the repo's usual
 * isDevNewsroomDebugAllowed()/isProductionDeployment() guard, which checks
 * NODE_ENV === "production" first — true for every Vercel build, Preview
 * included, since `next build` always sets NODE_ENV=production regardless
 * of which Vercel environment it's deploying to. VERCEL_ENV is the actual
 * Preview-vs-Production signal). Never runs in Production.
 *
 * Makes exactly one real call per provider/model combination under test —
 * free-tier quotas here are scarce (gemini-3.6-flash is 20 requests/day
 * total), so this intentionally does not loop or retry.
 */

import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
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
    return NextResponse.json(
      { ok: false, error: "Forbidden — smoke test is disabled in production" },
      { status: 403, headers: noStoreHeaders() }
    );
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
    },
    { status: 200, headers: noStoreHeaders() }
  );
}
