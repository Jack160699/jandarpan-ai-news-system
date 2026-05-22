/**
 * GET /api/editorial/dashboard — realtime editorial control snapshot
 */

import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/editorial-dashboard/auth";
import { fetchEditorialDashboard } from "@/lib/editorial-dashboard/fetch-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await fetchEditorialDashboard();
  if (!snapshot) {
    return NextResponse.json(
      { ok: false, error: "Database not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, ...snapshot });
}
