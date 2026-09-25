import { NextResponse } from "next/server";
import { runComplianceHealthCheck } from "@/lib/compliance/health-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await runComplianceHealthCheck();
    return NextResponse.json({ ok: true, report });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
