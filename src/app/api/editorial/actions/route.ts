/**
 * POST /api/editorial/actions — editorial newsroom mutations
 */

import { NextResponse } from "next/server";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import {
  disableRssSource,
  enableRssSource,
  setArticleBreaking,
  setArticleEditorialStatus,
  setArticleFeatured,
  setHomepagePin,
  updateArticleHeadline,
} from "@/lib/editorial-dashboard/actions";
import { logDeskPublicationEvent } from "@/lib/editorial/publication";
import {
  queueArticleImageRegeneration,
  regenerateGeneratedArticle,
} from "@/lib/editorial-dashboard/regenerate";
import { enrichArticleIntelligence } from "@/lib/intelligence";
import { permissionForEditorialAction } from "@/lib/newsroom-auth/action-permissions";
import { checkEditorialAiRateLimit } from "@/lib/security/ai-rate-limit";
import { assertGeneratedArticleTenantAccess } from "@/lib/security/tenant-guard";

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

const AI_ACTIONS = new Set([
  "regenerate_article",
  "regenerate_image",
  "enrich_intelligence",
]);

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

  const tenantId = auth.session.membership.tenantId;

  if (body.articleId) {
    const access = await assertGeneratedArticleTenantAccess(body.articleId, tenantId);
    if (!access.ok) {
      return NextResponse.json({ ok: false, error: "Article not found" }, { status: 404 });
    }
  }

  if (AI_ACTIONS.has(body.action)) {
    const rate = await checkEditorialAiRateLimit(auth.session, `actions:${body.action}`);
    if (!rate.allowed) return rate.response;
  }

  let result: { ok: boolean; message?: string };

  switch (body.action) {
    case "approve": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleEditorialStatus(body.articleId, tenantId, "approved");
      if (result.ok) {
        await logDeskPublicationEvent({
          tenantId,
          articleId: body.articleId,
          actorUserId: auth.session.userId,
          actorEmail: auth.session.email,
          event: "published",
        });
      }
      break;
    }
    case "reject": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleEditorialStatus(body.articleId, tenantId, "rejected");
      if (result.ok) {
        await logDeskPublicationEvent({
          tenantId,
          articleId: body.articleId,
          actorUserId: auth.session.userId,
          actorEmail: auth.session.email,
          event: "rejected",
        });
      }
      break;
    }
    case "manual_publish": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleEditorialStatus(body.articleId, tenantId, "approved");
      if (result.ok) {
        await logDeskPublicationEvent({
          tenantId,
          articleId: body.articleId,
          actorUserId: auth.session.userId,
          actorEmail: auth.session.email,
          event: "published",
        });
      }
      break;
    }
    case "pin": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setHomepagePin(body.articleId, tenantId, true);
      break;
    }
    case "unpin": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setHomepagePin(body.articleId, tenantId, false);
      break;
    }
    case "feature": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleFeatured(body.articleId, tenantId, true);
      break;
    }
    case "unfeature": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleFeatured(body.articleId, tenantId, false);
      break;
    }
    case "update_headline": {
      if (!body.articleId || !body.headline) {
        return badRequest("articleId and headline required");
      }
      result = await updateArticleHeadline(body.articleId, tenantId, body.headline);
      break;
    }
    case "mark_breaking": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleBreaking(body.articleId, tenantId, true);
      break;
    }
    case "unmark_breaking": {
      if (!body.articleId) return badRequest("articleId required");
      result = await setArticleBreaking(body.articleId, tenantId, false);
      break;
    }
    case "regenerate_article": {
      if (!body.articleId) return badRequest("articleId required");
      result = await regenerateGeneratedArticle(body.articleId, tenantId);
      break;
    }
    case "regenerate_image": {
      if (!body.articleId) return badRequest("articleId required");
      result = await queueArticleImageRegeneration(body.articleId, tenantId);
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
      const enriched = await enrichArticleIntelligence(body.articleId, { tenantId });
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
