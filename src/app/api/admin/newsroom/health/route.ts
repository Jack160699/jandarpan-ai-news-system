/**
 * GET /api/admin/newsroom/health — read-only newsroom health summary
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { fetchEditorialDashboard } from "@/lib/editorial-dashboard/fetch-dashboard";
import { fetchWorkflowBoard } from "@/lib/editorial-workflow/store";
import {
  getCachedDashboard,
  setCachedDashboard,
} from "@/lib/infrastructure/cache/dashboard";
import { getLaunchHealthWidgets } from "@/lib/ops/launch-health";
import { buildNewsroomHealth } from "@/lib/newsroom-health/build-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "monitoring:read");
  if (!auth.ok) return auth.response;

  const tenantId = auth.session.membership.tenantId;

  let editorial = await getCachedDashboard<
    Awaited<ReturnType<typeof fetchEditorialDashboard>>
  >(tenantId, "editorial");

  if (!editorial) {
    editorial = await fetchEditorialDashboard(tenantId);
    if (editorial) {
      await setCachedDashboard(tenantId, "editorial", editorial);
    }
  }

  const [workflowBoard, launchWidgets] = await Promise.all([
    fetchWorkflowBoard(tenantId),
    getLaunchHealthWidgets(),
  ]);

  const health = buildNewsroomHealth({
    editorial,
    workflowAnalytics: workflowBoard?.analytics ?? null,
    launchWidgets,
  });

  return NextResponse.json({
    ok: true,
    health,
    workflowAnalytics: workflowBoard?.analytics ?? null,
    launchWidgets,
    timestamp: new Date().toISOString(),
  });
}
