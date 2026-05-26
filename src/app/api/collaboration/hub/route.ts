import { NextResponse } from "next/server";
import { fetchCollaborationHub } from "@/lib/collaboration/store";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  const hub = await fetchCollaborationHub(
    guard.session.membership.tenantId,
    guard.session.userId
  );

  return NextResponse.json({ ok: true, hub });
}
