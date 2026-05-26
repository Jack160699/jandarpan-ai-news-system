import { NextResponse } from "next/server";
import { fetchTenantBilling } from "@/lib/platform/billing";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireDashboardSession(request, "billing:read");
  if (!guard.ok) return guard.response;

  const billing = await fetchTenantBilling(guard.session);
  return NextResponse.json({ ok: true, billing });
}
