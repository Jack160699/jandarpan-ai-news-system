import { NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/collaboration/store";
import { requireDashboardSession } from "@/lib/saas-auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const guard = await requireDashboardSession(request, "editorial:write");
  if (!guard.ok) return guard.response;

  let body: { notificationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.notificationId) {
    return NextResponse.json(
      { ok: false, error: "notificationId required" },
      { status: 400 }
    );
  }

  await markNotificationRead(guard.session.userId, body.notificationId);
  return NextResponse.json({ ok: true });
}
