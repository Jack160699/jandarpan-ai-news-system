/**
 * GET /api/admin/ops/errors — admin error tracking dashboard
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { getRecentOpsErrors, getOpsErrorSummary } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "monitoring:read");
  if (!auth.ok) return auth.response;

  let body: {
    source?: string;
    message?: string;
    severity?: "low" | "medium" | "high" | "critical";
    metadata?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.message || !body.source) {
    return NextResponse.json(
      { ok: false, error: "source and message required" },
      { status: 400 }
    );
  }

  const { trackOpsError } = await import("@/lib/observability/errors");
  const event = await trackOpsError({
    source: body.source,
    message: body.message,
    severity: body.severity ?? "medium",
    metadata: body.metadata,
  });

  return NextResponse.json({ ok: true, event });
}

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "monitoring:read");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));

  const [errors, summary] = await Promise.all([
    getRecentOpsErrors(limit),
    getOpsErrorSummary(),
  ]);

  return NextResponse.json({ ok: true, summary, errors });
}
