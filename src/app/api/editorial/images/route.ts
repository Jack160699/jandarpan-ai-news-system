/**
 * POST /api/editorial/images — image pipeline admin actions
 */

import { NextResponse } from "next/server";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { assertGeneratedArticleTenantAccess } from "@/lib/security/tenant-guard";
import {
  enqueueEditorialImage,
  replaceArticleHeroImage,
  setImageApprovalStatus,
  updateQueueCustomPrompt,
} from "@/lib/news/ai/editorial-image-queue";
import {
  fetchGenerationHistory,
  fetchRecentGenerationsForCompare,
} from "@/lib/news/ai/editorial-image-history";
import {
  getImageMetricsHistory,
  getImageMetricsSnapshot,
} from "@/lib/news/ai/editorial-image-metrics";
import { getProviderRecommendation } from "@/lib/news/ai/editorial-image-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImageActionBody = {
  action:
    | "regenerate"
    | "edit_prompt"
    | "history"
    | "compare"
    | "replace"
    | "approve"
    | "reject"
    | "metrics";
  articleId?: string;
  customPrompt?: string;
  heroUrl?: string;
  ogUrl?: string;
};

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const articleId = url.searchParams.get("articleId");

  const [metrics, history, provider] = await Promise.all([
    getImageMetricsSnapshot(),
    articleId ? fetchGenerationHistory(articleId) : Promise.resolve([]),
    Promise.resolve(getProviderRecommendation()),
  ]);

  return NextResponse.json({
    ok: true,
    metrics,
    history,
    providerRecommendation: provider,
  });
}

export async function POST(request: Request) {
  let body: ImageActionBody;
  try {
    body = (await request.json()) as ImageActionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  if (!body.articleId && body.action !== "metrics") {
    return NextResponse.json({ ok: false, error: "articleId required" }, { status: 400 });
  }

  if (body.articleId) {
    const access = await assertGeneratedArticleTenantAccess(
      body.articleId,
      auth.session.membership.tenantId
    );
    if (!access.ok) {
      return NextResponse.json({ ok: false, error: "Article not found" }, { status: 404 });
    }
  }

  let result: { ok: boolean; message?: string; data?: unknown };

  switch (body.action) {
    case "regenerate": {
      const queued = await enqueueEditorialImage(body.articleId!, { priority: 10 });
      result = queued
        ? { ok: true, message: "Image regeneration queued" }
        : { ok: false, message: "Failed to queue" };
      break;
    }
    case "edit_prompt": {
      if (!body.customPrompt?.trim()) {
        return NextResponse.json({ ok: false, error: "customPrompt required" }, { status: 400 });
      }
      await updateQueueCustomPrompt(body.articleId!, body.customPrompt.trim());
      const queued = await enqueueEditorialImage(body.articleId!, {
        customPrompt: body.customPrompt.trim(),
        priority: 10,
      });
      result = queued
        ? { ok: true, message: "Custom prompt saved and queued" }
        : { ok: false, message: "Prompt saved but queue failed" };
      break;
    }
    case "history": {
      const history = await fetchGenerationHistory(body.articleId!);
      result = { ok: true, message: "History loaded", data: history };
      break;
    }
    case "compare": {
      const generations = await fetchRecentGenerationsForCompare(body.articleId!);
      result = { ok: true, message: "Generations loaded", data: generations };
      break;
    }
    case "replace": {
      if (!body.heroUrl?.trim()) {
        return NextResponse.json({ ok: false, error: "heroUrl required" }, { status: 400 });
      }
      const replaced = await replaceArticleHeroImage(
        body.articleId!,
        body.heroUrl.trim(),
        body.ogUrl?.trim()
      );
      result = replaced
        ? { ok: true, message: "Hero image replaced" }
        : { ok: false, message: "Replace failed" };
      break;
    }
    case "approve": {
      const ok = await setImageApprovalStatus(body.articleId!, "approved");
      result = ok
        ? { ok: true, message: "Image approved" }
        : { ok: false, message: "Approve failed" };
      break;
    }
    case "reject": {
      const ok = await setImageApprovalStatus(body.articleId!, "rejected");
      result = ok
        ? { ok: true, message: "Image rejected" }
        : { ok: false, message: "Reject failed" };
      break;
    }
    case "metrics": {
      const [snapshot, historyDays] = await Promise.all([
        getImageMetricsSnapshot(),
        getImageMetricsHistory(7),
      ]);
      result = {
        ok: true,
        message: "Metrics loaded",
        data: { snapshot, history: historyDays },
      };
      break;
    }
    default:
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }

  if (result.ok && body.articleId) {
    await logEditorialAudit({
      session: auth.session,
      action: `editorial.image.${body.action}`,
      resourceType: "article",
      resourceId: body.articleId,
      payload: { action: body.action },
    });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
