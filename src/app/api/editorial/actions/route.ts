/**
 * POST /api/editorial/actions — approve, reject, pin, RSS disable
 */

import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/editorial-dashboard/auth";
import {
  disableRssSource,
  enableRssSource,
  setArticleEditorialStatus,
  setHomepagePin,
} from "@/lib/editorial-dashboard/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActionBody = {
  action:
    | "approve"
    | "reject"
    | "pin"
    | "unpin"
    | "disable_rss"
    | "enable_rss";
  articleId?: string;
  sourceId?: string;
  hours?: number;
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
      const result = await setArticleEditorialStatus(body.articleId, "approved");
      return jsonResult(result);
    }
    case "reject": {
      if (!body.articleId) return badRequest("articleId required");
      const result = await setArticleEditorialStatus(body.articleId, "rejected");
      return jsonResult(result);
    }
    case "pin": {
      if (!body.articleId) return badRequest("articleId required");
      const result = await setHomepagePin(body.articleId, true);
      return jsonResult(result);
    }
    case "unpin": {
      if (!body.articleId) return badRequest("articleId required");
      const result = await setHomepagePin(body.articleId, false);
      return jsonResult(result);
    }
    case "disable_rss": {
      if (!body.sourceId) return badRequest("sourceId required");
      const result = await disableRssSource(body.sourceId, body.hours ?? 48);
      return jsonResult(result);
    }
    case "enable_rss": {
      if (!body.sourceId) return badRequest("sourceId required");
      const result = await enableRssSource(body.sourceId);
      return jsonResult(result);
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
