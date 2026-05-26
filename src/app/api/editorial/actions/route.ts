/**
 * POST /api/editorial/actions — editorial newsroom mutations
 */

import { NextResponse } from "next/server";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import {
  disableRssSource,
  enableRssSource,
  manualPublishArticle,
  setArticleBreaking,
  setArticleEditorialStatus,
  setArticleFeatured,
  setHomepagePin,
  updateArticleHeadline,
} from "@/lib/editorial-dashboard/actions";
import {
  queueArticleImageRegeneration,
  regenerateGeneratedArticle,
} from "@/lib/editorial-dashboard/regenerate";
import { enrichArticleIntelligence } from "@/lib/intelligence";
import { permissionForEditorialAction } from "@/lib/newsroom-auth/action-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActionBody = {
  action:
    | "approve"
    | "reject"
    | "pin"
    | "unpin"
    | "disable_rss"
    | "enable_rss"
    | "update_headline"
    | "mark_breaking"
    | "unmark_breaking"
    | "feature"
    | "unfeature"
    | "manual_publish"
    | "regenerate_article"
    | "regenerate_image"
    | "enrich_intelligence";
  articleId?: string;
  sourceId?: string;
  hours?: number;
  headline?: string;
};

export async function POST(request: Request) {
  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const auth = await requireEditorialAuth(
    request,
    permissionForEditorialAction(body.action)
  );
  if (!auth.ok) return auth.response;

  let result: { ok: boolean; message?: string };

  switch (body.action) {
    case "approve": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleEditorialStatus(body.articleId, "approved");
      break;
    }
    case "reject": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleEditorialStatus(body.articleId, "rejected");
      break;
    }
    case "manual_publish": {
      if (!body.articleId) return badRequest("articleId required");
      result = await manualPublishArticle(body.articleId);
      break;
    }
    case "pin": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setHomepagePin(body.articleId, true);
      break;
    }
    case "unpin": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setHomepagePin(body.articleId, false);
      break;
    }
    case "feature": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleFeatured(body.articleId, true);
      break;
    }
    case "unfeature": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleFeatured(body.articleId, false);
      break;
    }
    case "update_headline": {
      if (!body.articleId || !body.headline) {
        return badRequest("articleId and headline required");
      }
      result = await updateArticleHeadline(body.articleId, body.headline);
      break;
    }
    case "mark_breaking": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleBreaking(body.articleId, true);
      break;
    }
    case "unmark_breaking": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleBreaking(body.articleId, false);
      break;
    }
    case "regenerate_article": {
      if (!body.articleId) return badRequest("articleId required");
      result = await regenerateGeneratedArticle(body.articleId);
      break;
    }
    case "regenerate_image": {
      if (!body.articleId) return badRequest("articleId required");
      result = await queueArticleImageRegeneration(body.articleId);
      break;
    }
    case "disable_rss": {
      if (!body.sourceId) return badRequest("sourceId required");
      result = await disableRssSource(body.sourceId, body.hours ?? 48);
      break;
    }
    case "enable_rss": {
      if (!body.sourceId) return badRequest("sourceId required");
      result = await enableRssSource(body.sourceId);
      break;
    }
    case "enrich_intelligence": {
      if (!body.articleId) return badRequest("articleId required");
      const enriched = await enrichArticleIntelligence(body.articleId);
      result = {
        ok: enriched.ok,
        message: enriched.ok ? "Intelligence enriched" : enriched.error,
      };
      break;
    }
    default:
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }

  if (result.ok) {
    await logEditorialAudit({
      session: auth.session,
      action: `editorial.${body.action}`,
      resourceType: body.articleId ? "article" : "rss_source",
      resourceId: body.articleId ?? body.sourceId ?? null,
      payload: { action: body.action },
    });
  }

  return jsonResult(result);
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function jsonResult(result: { ok: boolean; message?: string }) {
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
