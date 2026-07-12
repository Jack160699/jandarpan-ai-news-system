/**
 * GET /api/admin/seo/execution — execution center dashboard
 * Query: ?auditArticleId=<uuid> to run a new SEO audit (human-triggered)
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { isSeoExecutionEngineEnabled } from "@/lib/seo-execution/config";
import { runArticleSeoAudit } from "@/lib/seo-execution/engine";
import { getExecutionDashboard } from "@/lib/seo-execution/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const auditArticleId = url.searchParams.get("auditArticleId");

  let auditResult = null;
  if (auditArticleId && isSeoExecutionEngineEnabled()) {
    auditResult = await runArticleSeoAudit(
      auditArticleId,
      auth.session.userId
    );
  }

  const dashboard = await getExecutionDashboard();

  return NextResponse.json({
    ok: true,
    enabled: isSeoExecutionEngineEnabled(),
    dashboard,
    auditResult,
    timestamp: new Date().toISOString(),
  });
}
