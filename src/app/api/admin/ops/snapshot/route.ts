/**
 * GET /api/admin/ops/snapshot — real-time operational metrics for the admin control center.
 * Requires an authenticated admin session with monitoring or analytics access.
 */

import { NextResponse } from "next/server";
import { requireAnyAdminPermission } from "@/lib/auth/admin-authorization";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { getOpsView } from "@/lib/admin-ops/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ["monitoring:read", "analytics:read"]);
  if (!auth.ok) return auth.response;

  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  try {
    const view = await getOpsView({ fresh });
    return NextResponse.json({ ok: true, view }, { headers: noStoreHeaders() });
  } catch (err) {
    console.error("[admin-ops] snapshot failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "snapshot_failed" },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}
