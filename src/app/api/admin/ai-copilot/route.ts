/**
 * GET /api/admin/ai-copilot — unified intelligence dashboard
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { loadCopilotDashboard } from "@/lib/ai-copilot/engine";
import { buildArticleWorkspace } from "@/lib/ai-copilot/workspace";
import { isAiCopilotEnabled } from "@/lib/ai-copilot/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const articleId = url.searchParams.get("articleId");
  const sync = url.searchParams.get("sync") !== "false";

  const dashboard = await loadCopilotDashboard({ sync });
  const workspace = articleId ? await buildArticleWorkspace(articleId) : null;

  return NextResponse.json({
    ok: true,
    enabled: isAiCopilotEnabled(),
    dashboard,
    workspace,
    timestamp: new Date().toISOString(),
  });
}
