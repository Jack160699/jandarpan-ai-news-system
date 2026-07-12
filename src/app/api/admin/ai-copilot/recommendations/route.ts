/**
 * GET /api/admin/ai-copilot/recommendations — priority queue
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { collectRecommendationDrafts } from "@/lib/ai-copilot/recommendation-engine";
import { isAiCopilotEnabled } from "@/lib/ai-copilot/config";
import { listRecommendations, syncRecommendations } from "@/lib/ai-copilot/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "analytics:read");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 30), 100);
  const refresh = url.searchParams.get("refresh") === "true";

  if (refresh && isAiCopilotEnabled()) {
    const drafts = await collectRecommendationDrafts();
    await syncRecommendations(drafts);
  }

  const recommendations = await listRecommendations(limit);

  return NextResponse.json({
    ok: true,
    enabled: isAiCopilotEnabled(),
    recommendations,
    count: recommendations.length,
    timestamp: new Date().toISOString(),
  });
}
