import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { listAdminSources } from "@/lib/platform-admin/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "providers:read");
  if (!auth.ok) return auth.response;

  const sources = await listAdminSources();
  if (!sources) {
    return NextResponse.json(
      { ok: false, error: "database_unavailable" },
      { status: 503 }
    );
  }

  const summary = {
    total: sources.length,
    enabled: sources.filter((s) => s.enabled).length,
    healthy: sources.filter((s) => s.healthStatus === "healthy").length,
    degraded: sources.filter((s) => s.healthStatus === "degraded").length,
    disabled: sources.filter((s) => s.healthStatus === "disabled" || !s.enabled).length,
    avgTrust:
      sources.length > 0
        ? sources.reduce((a, s) => a + s.trustScore, 0) / sources.length
        : 0,
  };

  return NextResponse.json({ ok: true, sources, summary });
}
