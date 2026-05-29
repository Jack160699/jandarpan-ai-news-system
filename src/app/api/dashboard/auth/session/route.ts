import { NextResponse } from "next/server";
import { mapDashboardToAdminSession } from "@/lib/auth/map-admin-session";
import { logAdminSession } from "@/lib/auth/admin-session-log";
import { syncMembershipCookiesFromSession } from "@/lib/auth/sync-membership-cookies";
import { getDashboardSession } from "@/lib/saas-auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getDashboardSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    if (!session.membership?.role) {
      logAdminSession("missing_membership", { userId: session.userId });
      return NextResponse.json(
        { ok: false, error: "membership_unresolved" },
        { status: 403 }
      );
    }

    await syncMembershipCookiesFromSession(session);

    const payload = mapDashboardToAdminSession(session);
    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "membership_unresolved" },
        { status: 403 }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[admin-session] session_route_error", error);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
