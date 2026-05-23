/**
 * POST /api/editorial/actions — editorial newsroom mutations
 */

import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/editorial-dashboard/auth";
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
    | "regenerate_image";
  articleId?: string;
  sourceId?: string;
  hours?: number;
  headline?: string;
};

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  switch (body.action) {
    case "approve": {
      if (!body.articleId) return badRequest("articleId required");
      return jsonResult(await setArticleEditorialStatus(body.articleId, "approved"));
    }
    case "reject": {
      if (!body.articleId) return badRequest("articleId required");
      return jsonResult(await setArticleEditorialStatus(body.articleId, "rejected"));
    }
    case "manual_publish": {
      if (!body.articleId) return badRequest("articleId required");
      return jsonResult(await manualPublishArticle(body.articleId));
    }
    case "pin": {
      if (!body.articleId) return badRequest("articleId required");
      return jsonResult(await setHomepagePin(body.articleId, true));
    }
    case "unpin": {
      if (!body.articleId) return badRequest("articleId required");
      return jsonResult(await setHomepagePin(body.articleId, false));
    }
    case "feature": {
      if (!body.articleId) return badRequest("articleId required");
      return jsonResult(await setArticleFeatured(body.articleId, true));
    }
    case "unfeature": {
      if (!body.articleId) return badRequest("articleId required");
      return jsonResult(await setArticleFeatured(body.articleId, false));
    }
    case "update_headline": {
      if (!body.articleId || !body.headline) {
        return badRequest("articleId and headline required");
      }
      return jsonResult(
        await updateArticleHeadline(body.articleId, body.headline)
      );
    }
    case "mark_breaking": {
      if (!body.articleId) return badRequest("articleId required");
      return jsonResult(await setArticleBreaking(body.articleId, true));
    }
    case "unmark_breaking": {
      if (!body.articleId) return badRequest("articleId required");
      return jsonResult(await setArticleBreaking(body.articleId, false));
    }
    case "regenerate_article": {
      if (!body.articleId) return badRequest("articleId required");
      return jsonResult(await regenerateGeneratedArticle(body.articleId));
    }
    case "regenerate_image": {
      if (!body.articleId) return badRequest("articleId required");
      return jsonResult(await queueArticleImageRegeneration(body.articleId));
    }
    case "disable_rss": {
      if (!body.sourceId) return badRequest("sourceId required");
      return jsonResult(await disableRssSource(body.sourceId, body.hours ?? 48));
    }
    case "enable_rss": {
      if (!body.sourceId) return badRequest("sourceId required");
      return jsonResult(await enableRssSource(body.sourceId));
    }
    default:
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function jsonResult(result: { ok: boolean; message?: string }) {
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
