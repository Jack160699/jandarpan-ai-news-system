/**
 * POST /api/admin/system/validate — run full validation suite
 */

import { NextResponse } from "next/server";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";
import { runFullValidation } from "@/lib/system-validation/engine";
import { isSystemValidationEnabled } from "@/lib/system-validation/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await requireEditorialAuth(request, "monitoring:read");
  if (!auth.ok) return auth.response;

  if (!isSystemValidationEnabled()) {
    return NextResponse.json(
      { ok: false, error: "validation_disabled" },
      { status: 403 }
    );
  }

  let body: { runType?: string; selfHeal?: boolean } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const report = await runFullValidation({
    runType: body.runType ?? "full",
    triggeredBy: auth.session.email ?? auth.session.userId,
    selfHeal: body.selfHeal,
  });

  return NextResponse.json({
    ok: report.ok,
    report,
    timestamp: new Date().toISOString(),
  });
}
