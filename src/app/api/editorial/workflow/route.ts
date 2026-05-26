import { NextResponse } from "next/server";
import { logEditorialAudit } from "@/lib/dashboard/audit";
import { fetchWorkflowBoard } from "@/lib/editorial-workflow/store";
import { requireEditorialAuth } from "@/lib/editorial-dashboard/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireEditorialAuth(request, "editorial:write");
  if (!auth.ok) return auth.response;

  const board = await fetchWorkflowBoard(auth.session.membership.tenantId);
  if (!board) {
    return NextResponse.json({ ok: false, error: "board_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, ...board });
}
