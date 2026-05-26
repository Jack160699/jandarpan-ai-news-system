import { NextResponse } from "next/server";
import { requireDashboardSession } from "@/lib/saas-auth/guard";
import { get2faStatus } from "@/lib/security/two-factor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request);
  if (!guard.ok) return guard.response;

  const status = await get2faStatus(guard.session.userId);
  return NextResponse.json({ ok: true, ...status });
}
