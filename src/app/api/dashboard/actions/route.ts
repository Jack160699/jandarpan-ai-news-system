import { NextResponse } from "next/server";
import { runDashboardAction } from "@/lib/dashboard/actions";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  let body: Record<string, string | number | boolean | undefined> & {
    action?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.action) {
    return NextResponse.json({ ok: false, error: "action_required" }, { status: 400 });
  }

  const result = await runDashboardAction(
    guard.session,
    body.action,
    body
  );

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
